import type {
  IdentifyResponse,
  CreateFeedbackData,
  CreateFeedbackResponse,
  FeedbackClient,
  FeedbackItem,
  FeedbackListResponse,
  UpdateFeedbackData,
  UpdateFeedbackResponse,
  WidgetConfig,
} from "@fasterfixes/core";
import { SEED_PINS } from "./seed-pins";

const VISITOR_PINS_KEY = "fasterfixes:demo:visitor-pins";
const DELETED_SEEDS_KEY = "fasterfixes:demo:deleted-seeds";
const SEED_OVERRIDES_KEY = "fasterfixes:demo:seed-overrides";

const DEMO_CONFIG: WidgetConfig = {
  enabled: true,
  branding: false,
};

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — silently drop the write
  }
}

function generateId(): string {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * `FeedbackClient` implementation backed entirely by `sessionStorage` and
 * an in-memory seed list. No network requests. Used for the homepage demo.
 *
 * Visitor pins live under one storage key. Edits and deletions of seeded
 * pins are tracked in two parallel keys so they survive a mid-session
 * refresh; closing the tab resets everything to the original seeds.
 */
export class LocalStorageFeedbackClient implements FeedbackClient {
  private readVisitorPins(): FeedbackItem[] {
    return safeRead<FeedbackItem[]>(VISITOR_PINS_KEY, []);
  }

  private writeVisitorPins(pins: FeedbackItem[]): void {
    safeWrite(VISITOR_PINS_KEY, pins);
  }

  private readDeletedSeeds(): string[] {
    return safeRead<string[]>(DELETED_SEEDS_KEY, []);
  }

  private writeDeletedSeeds(ids: string[]): void {
    safeWrite(DELETED_SEEDS_KEY, ids);
  }

  private readSeedOverrides(): Record<string, Partial<FeedbackItem>> {
    return safeRead<Record<string, Partial<FeedbackItem>>>(
      SEED_OVERRIDES_KEY,
      {},
    );
  }

  private writeSeedOverrides(
    overrides: Record<string, Partial<FeedbackItem>>,
  ): void {
    safeWrite(SEED_OVERRIDES_KEY, overrides);
  }

  private isSeedId(id: string): boolean {
    return SEED_PINS.some((p) => p.id === id);
  }

  /** Demo: no server; hand back a fake session so the identity path renders. */
  async identify(identity: string): Promise<IdentifyResponse> {
    return {
      session: `demo_${identity.slice(0, 8)}`,
      expiresIn: 3600,
      reviewer: { id: "demo-reviewer", name: "Demo reviewer", role: "admin", canSeeAll: true },
    };
  }

  async getConfig(): Promise<WidgetConfig> {
    return DEMO_CONFIG;
  }

  async getFeedback(): Promise<FeedbackListResponse> {
    const deletedSeedIds = new Set(this.readDeletedSeeds());
    const overrides = this.readSeedOverrides();
    const seedPageUrl =
      typeof window !== "undefined" ? window.location.href : "";

    const visibleSeeds = SEED_PINS.filter((p) => !deletedSeedIds.has(p.id)).map(
      (p) => ({
        ...p,
        pageUrl: seedPageUrl,
        ...(overrides[p.id] ?? {}),
      }),
    );

    return { feedback: [...visibleSeeds, ...this.readVisitorPins()] };
  }

  async createFeedback(
    data: CreateFeedbackData,
  ): Promise<CreateFeedbackResponse> {
    const item: FeedbackItem = {
      id: generateId(),
      status: "new",
      comment: data.comment,
      pageUrl: data.pageUrl,
      clickX: data.clickX ?? null,
      clickY: data.clickY ?? null,
      selector: data.selector ?? null,
      screenshotUrl: null,
      reviewer: { id: "demo-visitor", name: "You" },
      createdAt: new Date().toISOString(),
      metadata: data.metadata ?? null,
    };

    this.writeVisitorPins([...this.readVisitorPins(), item]);
    return item;
  }

  async updateFeedback(
    id: string,
    data: UpdateFeedbackData,
  ): Promise<UpdateFeedbackResponse> {
    const updatedAt = new Date().toISOString();

    if (this.isSeedId(id)) {
      const overrides = this.readSeedOverrides();
      this.writeSeedOverrides({
        ...overrides,
        [id]: { ...overrides[id], comment: data.comment },
      });
      return { id, comment: data.comment, updatedAt };
    }

    const visitor = this.readVisitorPins();
    this.writeVisitorPins(
      visitor.map((p) => (p.id === id ? { ...p, comment: data.comment } : p)),
    );
    return { id, comment: data.comment, updatedAt };
  }

  async deleteFeedback(id: string): Promise<void> {
    if (this.isSeedId(id)) {
      const deleted = this.readDeletedSeeds();
      if (!deleted.includes(id)) {
        this.writeDeletedSeeds([...deleted, id]);
      }
      return;
    }

    this.writeVisitorPins(this.readVisitorPins().filter((p) => p.id !== id));
  }

  async attachScreenshot(): Promise<void> {
    // Screenshots are intentionally disabled in the demo. No-op.
  }
}
