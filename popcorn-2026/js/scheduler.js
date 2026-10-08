async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

function cloneEntry(entry) {
  return { ...entry };
}

function referenceId(reference) {
  if (typeof reference !== "string" || !reference.includes("#")) {
    return null;
  }
  return reference.split("#").pop() || null;
}

export class Scheduler {
  constructor(playlist, options = {}) {
    this.playlist = playlist || { items: [] };
    const requestedDwell = Number(options.dwellSeconds);
    this.dwellSeconds = Number.isFinite(requestedDwell)
      && requestedDwell >= 2
      && requestedDwell <= 120
      ? requestedDwell
      : null;
    this.position = 0;
    this.lastKey = null;
    this.anchors = [];
    this.anchorCursor = 0;
    this.onceQueue = [];
    this.parkedOnce = [];
    this.activeTriggers = new Set(options.activeTriggers || []);
    this.wildcardTemplates = [];
    this.bag = [];
    this.wildcardGroups = [];
    this.groupIndex = 0;
  }

  async init() {
    for (const item of this.playlist.items || []) {
      const entries = await this.#entriesForItem(item);
      // Accept the playlist's "one-shot" kind, keeping "once" as an alias.
      if (item.kind === "anchor") {
        this.anchors.push(...entries);
      } else if (item.kind === "one-shot" || item.kind === "once") {
        for (const entry of entries) {
          if (entry.trigger && !this.activeTriggers.has(entry.trigger)) {
            this.parkedOnce.push(entry);
          } else {
            this.onceQueue.push(entry);
          }
        }
      } else if (item.kind === "wildcard") {
        this.wildcardTemplates.push(...entries);
      }
    }
    if (this.#groupRotationTags().length) {
      this.#buildWildcardGroups();
    } else {
      this.#refillBag();
    }
  }

  // Dedup/repeat key: HTML slides have no media source, so fall back to the
  // template (then tag) so consecutive-repeat avoidance still works.
  #key(entry) {
    return entry.source || entry.template || entry.tag || null;
  }

  async #entriesForItem(item) {
    const sources = [];
    if (item.source) {
      sources.push(item.source);
    }
    if (item.glob) {
      const payload = await fetchJson(`api/files?glob=${encodeURIComponent(item.glob)}`);
      for (const file of payload.files || []) {
        sources.push(file);
      }
    }
    const dwell = this.dwellSeconds
      || item.dwell_seconds
      || this.playlist.policy?.min_dwell_seconds
      || 5;
    const productionId = item.production_id || referenceId(item.production_ref);
    // Template-driven HTML slide (no media source/glob): one entry per item.
    if (!sources.length) {
      return [{
        ...item,
        production_id: productionId,
        weight: item.weight || 1,
        tag: item.tag || null,
        source: null,
        dwell_seconds: dwell,
        template: item.template || null,
      }];
    }
    return sources.map(source => ({
      ...item,
      production_id: productionId,
      weight: item.weight || 1,
      tag: item.tag || null,
      source,
      dwell_seconds: dwell,
      template: item.template || null,
    }));
  }

  #refillBag() {
    this.bag = this.wildcardTemplates.map(cloneEntry);
    this.#shuffle(this.bag);
  }

  #shuffle(entries) {
    for (let idx = entries.length - 1; idx > 0; idx -= 1) {
      const swapIdx = Math.floor(Math.random() * (idx + 1));
      [entries[idx], entries[swapIdx]] = [entries[swapIdx], entries[idx]];
    }
  }

  #groupRotationTags() {
    const configured = this.playlist.policy?.group_rotation;
    if (!Array.isArray(configured)) {
      return [];
    }
    return [...new Set(configured.filter(tag => typeof tag === "string" && tag.length))];
  }

  #buildWildcardGroups() {
    const tags = this.#groupRotationTags();
    const listed = new Set(tags);
    const groups = tags.map(tag => this.wildcardTemplates.filter(entry => entry.tag === tag));
    const unlisted = this.wildcardTemplates.filter(entry => !listed.has(entry.tag));
    if (unlisted.length) {
      groups.push(unlisted);
    }
    this.wildcardGroups = groups
      .filter(entries => entries.length)
      .map(entries => ({ entries, bag: [], lastKey: null }));
    for (const group of this.wildcardGroups) {
      this.#refillGroupBag(group);
    }
  }

  #refillGroupBag(group) {
    group.bag = [];
    for (const entry of group.entries) {
      const weight = Math.max(1, Math.floor(Number(entry.weight) || 1));
      for (let count = 0; count < weight; count += 1) {
        group.bag.push(cloneEntry(entry));
      }
    }
    this.#shuffle(group.bag);
  }

  #pickNonRepeating(entries) {
    for (const entry of entries) {
      if (this.#key(entry) !== this.lastKey) {
        return entry;
      }
    }
    return entries[0] || null;
  }

  #pickAnchor() {
    const anchorSlot = this.anchors.some(entry => (
      entry.every_n
      && this.position % Number(entry.every_n) === 0
    ));
    if (!anchorSlot || !this.anchors.length) {
      return null;
    }
    for (let offset = 0; offset < this.anchors.length; offset += 1) {
      const index = (this.anchorCursor + offset) % this.anchors.length;
      const entry = this.anchors[index];
      if (this.#key(entry) !== this.lastKey || this.anchors.length === 1) {
        this.anchorCursor = (index + 1) % this.anchors.length;
        return cloneEntry(entry);
      }
    }
    return null;
  }

  #pickOnce() {
    if (!this.onceQueue.length) {
      return null;
    }
    const pick = this.#pickNonRepeating(this.onceQueue);
    const idx = this.onceQueue.indexOf(pick);
    this.onceQueue.splice(idx, 1);
    return cloneEntry(pick);
  }

  releaseTrigger(trigger) {
    if (!trigger || this.activeTriggers.has(trigger)) {
      return 0;
    }
    this.activeTriggers.add(trigger);
    const released = [];
    const parked = [];
    for (const entry of this.parkedOnce) {
      if (entry.trigger === trigger) {
        released.push(entry);
      } else {
        parked.push(entry);
      }
    }
    this.parkedOnce = parked;
    this.onceQueue.push(...released);
    return released.length;
  }

  #pickWildcard() {
    if (this.wildcardGroups.length) {
      const group = this.wildcardGroups[this.groupIndex];
      if (!group.bag.length) {
        this.#refillGroupBag(group);
      }
      let pickIdx = group.bag.findIndex(entry => (
        this.#key(entry) !== group.lastKey
        && this.#key(entry) !== this.lastKey
      ));
      if (pickIdx === -1) {
        pickIdx = group.bag.findIndex(entry => this.#key(entry) !== group.lastKey);
      }
      if (pickIdx === -1) {
        pickIdx = 0;
      }
      const [pick] = group.bag.splice(pickIdx, 1);
      group.lastKey = this.#key(pick);
      this.groupIndex = (this.groupIndex + 1) % this.wildcardGroups.length;
      return pick;
    }
    if (!this.wildcardTemplates.length) {
      return null;
    }
    if (!this.bag.length) {
      this.#refillBag();
    }
    if (!this.bag.length) {
      return null;
    }
    let pickIdx = this.bag.findIndex(entry => this.#key(entry) !== this.lastKey);
    if (pickIdx === -1) {
      pickIdx = 0;
    }
    const [pick] = this.bag.splice(pickIdx, 1);
    if (!this.bag.length) {
      this.#refillBag();
    }
    return pick;
  }

  next() {
    this.position += 1;
    const pick = this.#pickAnchor() || this.#pickOnce() || this.#pickWildcard();
    if (!pick) {
      return null;
    }
    this.lastKey = this.#key(pick);
    return pick;
  }

  previewNext() {
    const snapshot = {
      position: this.position,
      lastKey: this.lastKey,
      anchorCursor: this.anchorCursor,
      onceQueue: this.onceQueue.map(cloneEntry),
      parkedOnce: this.parkedOnce.map(cloneEntry),
      activeTriggers: new Set(this.activeTriggers),
      bag: this.bag.map(cloneEntry),
      groupIndex: this.groupIndex,
      wildcardGroups: this.wildcardGroups.map(group => ({
        entries: group.entries.map(cloneEntry),
        bag: group.bag.map(cloneEntry),
        lastKey: group.lastKey,
      })),
    };
    const preview = this.next();
    this.position = snapshot.position;
    this.lastKey = snapshot.lastKey;
    this.anchorCursor = snapshot.anchorCursor;
    this.onceQueue = snapshot.onceQueue;
    this.parkedOnce = snapshot.parkedOnce;
    this.activeTriggers = snapshot.activeTriggers;
    this.bag = snapshot.bag;
    this.groupIndex = snapshot.groupIndex;
    this.wildcardGroups = snapshot.wildcardGroups;
    return preview;
  }
}
