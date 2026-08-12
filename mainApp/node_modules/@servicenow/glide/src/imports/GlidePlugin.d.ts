export interface GlidePlugin {
  /**
   * Returns the plugin's unique name (ID).
   */
  getName(): string;

  /**
   * Returns the display name of the plugin.
   */
  getDisplayName(): string;

  /**
   * Returns the plugin's description.
   */
  getDescription(): any;

  /**
   * Returns the path of the plugin.
   */
  getPath(): string;

  /**
   * Refreshes the plugin's artifacts.
   */
  refreshArtifacts(): void;
}
