// Barrel exports for the `assets` feature surface.
// Re-exports the public form + hook so consumers can `import
// { HandoverForm, useHandoverDialog } from '../components/assets'`
// without drilling into the subfolders.
//
// `HandoverForm` is the presentational body of the dedicated
// `/handover` page; it was previously the body of a Syncfusion
// `DialogComponent` named `HandoverDialog` and now renders
// inside a normal page column. The hook keeps the same name
// (`useHandoverDialog`) for backward-compatibility with the
// spec — the hook is still semantically the handover dialog's
// form state, just consumed by a page now.
export { default as HandoverForm } from './HandoverForm';
export type { HandoverFormProps } from './HandoverForm';
export {
  useHandoverDialog,
  buildDefaultFormState,
  buildSubmission,
  canSubmitHandoverForm,
  isHandoverFieldInvalid,
  validateHandoverForm,
  DRAFT_NOTES_TEXT,
} from './useHandoverDialog';
export type {
  HandoverTouchableField,
  HandoverTouched,
  UseHandoverDialogArgs,
  UseHandoverDialogResult,
} from './useHandoverDialog';
