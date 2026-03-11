/**
 * VESTRA 이벤트 버스
 * ─────────────────
 * 크로스 기능 연계를 위한 인메모리 Pub/Sub 아키텍처.
 * 서버리스 환경(Vercel)에 적합한 요청 범위 이벤트 시스템.
 *
 * 특허 핵심: 각 분석 모듈의 결과가 이벤트로 발행되고,
 * 구독 모듈이 자동으로 반응하는 상호 참조 피드백 루프.
 */

import type { AnalysisEventType, AnalysisEvent } from "./patent-types";

type EventHandler = (event: AnalysisEvent) => void | Promise<void>;

interface EventSubscription {
  id: string;
  eventType: AnalysisEventType;
  handler: EventHandler;
  sourceModule: string;
}

interface EventHistoryEntry {
  event: AnalysisEvent;
  handledBy: string[];
  timestamp: string;
}

/**
 * 요청 범위 이벤트 버스
 * 각 API 요청마다 새 인스턴스 생성 → 서버리스 환경 안전
 */
export class AnalysisEventBus {
  private subscriptions: EventSubscription[] = [];
  private history: EventHistoryEntry[] = [];
  private eventIdCounter = 0;

  /**
   * 이벤트 구독
   */
  subscribe(
    eventType: AnalysisEventType,
    handler: EventHandler,
    sourceModule: string,
  ): string {
    const id = `sub_${++this.eventIdCounter}`;
    this.subscriptions.push({ id, eventType, handler, sourceModule });
    return id;
  }

  /**
   * 구독 해제
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions = this.subscriptions.filter(
      (s) => s.id !== subscriptionId
    );
  }

  /**
   * 이벤트 발행
   */
  async emit(event: AnalysisEvent): Promise<void> {
    const handledBy: string[] = [];
    const matchingSubs = this.subscriptions.filter(
      (s) => s.eventType === event.type
    );

    for (const sub of matchingSubs) {
      try {
        await sub.handler(event);
        handledBy.push(sub.sourceModule);
      } catch (error) {
        console.error(
          `[EventBus] Handler error in ${sub.sourceModule}:`,
          error
        );
      }
    }

    this.history.push({
      event,
      handledBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 이벤트 히스토리 조회
   */
  getHistory(): EventHistoryEntry[] {
    return [...this.history];
  }

  /**
   * 특정 타입 이벤트 히스토리
   */
  getEventsByType(type: AnalysisEventType): EventHistoryEntry[] {
    return this.history.filter((h) => h.event.type === type);
  }

  /**
   * 구독 현황
   */
  getSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  /**
   * 버스 초기화
   */
  clear(): void {
    this.subscriptions = [];
    this.history = [];
    this.eventIdCounter = 0;
  }
}

/**
 * 이벤트 버스 팩토리 (요청 당 1개)
 */
export function createEventBus(): AnalysisEventBus {
  return new AnalysisEventBus();
}
