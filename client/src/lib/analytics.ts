/**
 * Fire-and-forget anonymous usage events (FR-20). Never sends answers.
 */
import { api } from './api';

type EventType = 'questionnaire_start' | 'step_complete' | 'questionnaire_complete' | 'scheme_view' | 'checklist_download' | 'share';

export function track(type: EventType, extra: { schemeSlug?: string; step?: number } = {}) {
  api.event({ type, ...extra }).catch(() => {});
}
