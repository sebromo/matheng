export type EditorState = {
  activeRegionId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  openPanel: "tools" | "document" | null;
};

export class EditorStateStore {
  private state: EditorState = {
    activeRegionId: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    openPanel: "tools",
  };
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): EditorState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(updater: (state: EditorState) => EditorState): void {
    this.state = updater(this.state);
    for (const listener of this.listeners) listener();
  }
}
