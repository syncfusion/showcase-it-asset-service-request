// Shared shape types for the IT asset dashboard fixture and
// downstream components. Mirrors `src/data/dashboard.json` so the
// JSON import and the React tree agree on the same vocabulary.

export type KpiId = 'open' | 'sla' | 'aging' | 'handovers';

export type KpiIconVariant = 'info' | 'danger' | 'warning' | 'success';

export type KpiIconName =
  | 'inbox'
  | 'alarm-clock'
  | 'hourglass'
  | 'file-signature';

export interface Kpi {
  id: KpiId;
  label: string;
  value: number;
  delta: string;
  note: string;
  icon: KpiIconName;
  iconVariant: KpiIconVariant;
  title: string;
}

export type VolumeSeriesId = 'all' | 'incidents' | 'service';

export interface VolumeSeries {
  all: number[];
  incidents: number[];
  service: number[];
}

export interface Volume {
  title: string;
  subtitle: string;
  categories: string[];
  series: VolumeSeries;
}

export interface SlaBucket {
  id: string;
  label: string;
  count: number;
  colorToken: string;
}

export interface Sla {
  title: string;
  subtitle: string;
  buckets: SlaBucket[];
}

export interface Citation {
  label: string;
  kb?: string;
  route?: string;
}

export type AssistantActionKind = 'navigate' | 'copy' | 'toast';

export interface AssistantAction {
  id: string;
  label: string;
  kind?: AssistantActionKind;
  route?: string;
}

export type MessageRole = 'assistant' | 'user';

export interface AssistantMessage {
  id: string;
  role: MessageRole;
  meta?: string;
  text?: string;
  richText?: string;
  citations?: Citation[];
  actions?: AssistantAction[];
}

export interface CannedResponse {
  id: string;
  match: string;
  meta?: string;
  text?: string;
  richText?: string;
  citations?: Citation[];
  actions?: AssistantAction[];
}

export interface AssistantPrompt {
  label: string;
  prompt: string;
}

export interface AssistantNotice {
  /** Optional short label rendered next to the icon (e.g. "Sample provider"). */
  label?: string;
  /** Trust-statement copy. Multi-line is rendered as a single paragraph,
   *  same as the Assistant.tsx reference. */
  text: string;
}

export interface Assistant {
  title: string;
  subtitle: string;
  bannerLabel: string;
  prompts: AssistantPrompt[];
  conversation: AssistantMessage[];
  cannedResponses: CannedResponse[];
  footer?: string;
  /** Optional ShieldCheck-style trust notice rendered below the chat
   *  surface, modeled on the retail-control-tower `Assistant.tsx` page. */
  notice?: AssistantNotice;
}

export interface PageActionDescriptor {
  label: string;
  icon: string;
}

export interface PageActions {
  askAssistant: PageActionDescriptor;
  refresh: PageActionDescriptor;
}

export interface SeriesOption {
  id: VolumeSeriesId | string;
  label: string;
}

export interface Filters {
  seriesOptions: SeriesOption[];
}

export interface DashboardFixture {
  kpis: Kpi[];
  volume: Volume;
  sla: Sla;
  assistant: Assistant;
  pageActions: PageActions;
  filters: Filters;
}

export type ToastKind = 'success' | 'info' | 'error';

export interface ToastPayload {
  title: string;
  text?: string;
  kind?: ToastKind;
}

export interface Toast extends ToastPayload {
  id: string;
  kind: ToastKind;
}
