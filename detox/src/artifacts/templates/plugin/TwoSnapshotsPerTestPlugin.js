const ArtifactPlugin = require('./ArtifactPlugin');

/***
 * @abstract
 */
class TwoSnapshotsPerTestPlugin extends ArtifactPlugin {
  constructor({ api }) {
    super({ api });
    this._snapshots = [null, null];
  }

  async onBeforeEach(testSummary) {
    await super.onBeforeEach(testSummary);
    await this._takeAutomaticSnapshot(0);
  }

  async onAfterEach(testSummary) {
    await super.onAfterEach(testSummary);

    if (this.shouldKeepArtifactOfTest(testSummary)) {
      await this._takeAutomaticSnapshot(1);
      this._startSavingSnapshot(testSummary, 0);
      this._startSavingSnapshot(testSummary, 1);
    } else {
      this._startDiscardingSnapshot(0);
    }

    this._clearSnapshotReferences();
  }

  /***
   * @protected
   * @abstract
   */
  async preparePathForSnapshot(testSummary, index) {}


  /***
   * Creates a handle for a test artifact (video recording, log, etc.)
   *
   * @abstract
   * @protected
   * @return {Artifact} - an object with synchronous .discard() and .save(path) methods
   */
  createTestArtifact() {}

  async _takeAutomaticSnapshot(index) {
    if (this.enabled) {
      this._snapshots[index] = await this.takeSnapshot();
    }
  }

  /***
   * @protected
   */
  async takeSnapshot() {
    const snapshot = this.createTestArtifact();
    await snapshot.start();
    await snapshot.stop();
    this.api.trackArtifact(snapshot);

    return snapshot;
  }

  _startSavingSnapshot(testSummary, index) {
    const snapshot = this._snapshots[index];
    if (!snapshot) {
      return;
    }

    this.api.requestIdleCallback(async () => {
      const snapshotArtifactPath = await this.preparePathForSnapshot(testSummary, index);
      await snapshot.save(snapshotArtifactPath);
      this.api.untrackArtifact(snapshot);
    });
  }

  _startDiscardingSnapshot(index) {
    const snapshot = this._snapshots[index];
    if (!snapshot) {
      return;
    }

    this.api.requestIdleCallback(async () => {
      await snapshot.discard();
      this.api.untrackArtifact(snapshot);
    });
  }

  _clearSnapshotReferences() {
    this._snapshots[0] = null;
    this._snapshots[1] = null;
  }
}

module.exports = TwoSnapshotsPerTestPlugin;
