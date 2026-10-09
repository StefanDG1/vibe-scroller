// One automatic batch per entry/intent. A changed cursor alone cannot drain pages.
export class TopicPagingGate {
  private armed = true;
  private requested = new Set<string>();
  arm() {
    this.armed = true;
  }
  take(cursor: string | undefined, loading: boolean) {
    if (!cursor || loading || !this.armed || this.requested.has(cursor))
      return false;
    this.armed = false;
    this.requested.add(cursor);
    return true;
  }
}
