import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import {
  DialogComponent,
} from '@syncfusion/ej2-react-popups';
import type { ChangeEventArgs as DropdownChange } from '@syncfusion/ej2-dropdowns';
import {
  DropDownListComponent,
} from '@syncfusion/ej2-react-dropdowns';
import type { ChangeEventArgs as TextBoxChange } from '@syncfusion/ej2-inputs';
import {
  TextBoxComponent,
} from '@syncfusion/ej2-react-inputs';
import type {
  NewRequestInput,
  OwnerOption,
  Priority,
  RequestStatus,
  SlaChip,
  SlaOption,
} from '../../types/requests';
import {
  DEFAULT_NEW_REQUEST,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
} from '../../types/requests';
import './requests.css';

export interface NewRequestDialogProps {
  open: boolean;
  ownerOptions: OwnerOption[];
  slaOptions: SlaOption[];
  /** Called when the user activates Save with a valid form. */
  onSave: (input: NewRequestInput) => void;
  /** Called when the user cancels, presses ESC, or clicks the backdrop. */
  onClose: () => void;
}

const TITLE_INPUT_ID = 'requests-dialog-title';
const PRIORITY_DDL_ID = 'requests-dialog-priority';
const OWNER_DDL_ID = 'requests-dialog-owner';
const SLA_DDL_ID = 'requests-dialog-sla';
const STATUS_DDL_ID = 'requests-dialog-status';

const PRIORITY_OPTIONS = [
  { id: 'Low', label: 'Low' },
  { id: 'Medium', label: 'Medium' },
  { id: 'High', label: 'High' },
  { id: 'Critical', label: 'Critical' },
] as const;

const STATUS_OPTIONS = REQUEST_STATUSES.map((key) => ({
  id: key,
  label: REQUEST_STATUS_LABELS[key],
}));

/** `null` (i.e. `(Unassigned)`) renders as a separate option. */
const UNASSIGNED_ID = '__unassigned__';

/**
 * New-request dialog — a Syncfusion `DialogComponent` whose body is a
 * form with the fields the spec requires:
 * - `Title` (required, single-line, max 80 chars)
 * - `Priority` (required dropdown, default `Medium`)
 * - `Assign to` (optional dropdown, default `(Unassigned)`)
 * - `SLA` (required dropdown of the fixture's `slaOptions`, default
 *   `SLA 3d`)
 * - `Status` (required dropdown of the four column keys, default
 *   `New`)
 *
 * The dialog's Save button validates the form: empty `Title` blocks
 * Save and surfaces a visible error. The dialog's `close` event and
 * the Cancel button both route through the same `onClose` handler
 * that always discards the in-flight form state, so the user can
 * never accidentally save a half-filled form via ESC or backdrop
 * click.
 */
const NewRequestDialog: FC<NewRequestDialogProps> = ({
  open,
  ownerOptions,
  slaOptions,
  onSave,
  onClose,
}) => {
  const dialogRef = useRef<DialogComponent | null>(null);

  const [form, setForm] = useState<NewRequestInput>(DEFAULT_NEW_REQUEST);
  const [titleError, setTitleError] = useState<string>('');

  // Sync the dialog's open state with the parent.
  useEffect(() => {
    if (!dialogRef.current) return;
    if (open && !dialogRef.current.visible) {
      dialogRef.current.show();
    } else if (!open && dialogRef.current.visible) {
      dialogRef.current.hide();
    }
  }, [open]);

  // Reset the form state when the dialog closes (so a half-filled
  // form from a previous open never leaks into a new open).
  useEffect(() => {
    if (!open) {
      setForm(DEFAULT_NEW_REQUEST);
      setTitleError('');
    }
  }, [open]);

  /**
   * Wire the dialog's `close` event so ESC / backdrop / X button
   * all route through `onClose`. The dialog's `visible` flag flips
   * off in this handler; we let the parent re-render with `open =
   * false` and the `useEffect` above hides the underlying dialog.
   */
  const handleDialogClose = (): void => {
    onClose();
  };

  const handleTitleChange = (args: TextBoxChange): void => {
    // Syncfusion's TextBoxComponent passes its own `ChangeEventArgs`
    // (with a `value` property), not a React `ChangeEvent`. Reading
    // `e.target.value` would always be `undefined`, which clobbers
    // the form's title and triggers a spurious "Title is required"
    // error on save.
    const next = typeof args.value === 'string' ? args.value : '';
    setForm((prev) => ({ ...prev, title: next.slice(0, 80) }));
    if (titleError && next.trim().length > 0) {
      setTitleError('');
    }
  };

  const handlePriorityChange = (args: DropdownChange): void => {
    const value = String(args.value ?? DEFAULT_NEW_REQUEST.priority) as Priority;
    setForm((prev) => ({ ...prev, priority: value }));
  };

  const handleOwnerChange = (args: DropdownChange): void => {
    const raw = args.value;
    const value =
      raw === null || raw === undefined || raw === '' || raw === UNASSIGNED_ID
        ? null
        : String(raw);
    setForm((prev) => ({ ...prev, ownerId: value }));
  };

  const handleSlaChange = (args: DropdownChange): void => {
    const id = String(args.value ?? '');
    const opt = slaOptions.find((o) => o.id === id);
    const chip: SlaChip = opt ? opt.chip : DEFAULT_NEW_REQUEST.sla;
    setForm((prev) => ({ ...prev, sla: chip }));
  };

  const handleStatusChange = (args: DropdownChange): void => {
    const value = String(args.value ?? DEFAULT_NEW_REQUEST.status) as RequestStatus;
    setForm((prev) => ({ ...prev, status: value }));
  };

  const handleSave = (): void => {
    const title = form.title.trim();
    if (!title) {
      setTitleError('Title is required.');
      return;
    }
    onSave({ ...form, title });
  };

  const handleCancel = (): void => {
    onClose();
  };

  // The DropDownListComponent's `dataSource` is the option list; the
  // `fields.text` + `fields.value` mapping keeps the option shape in
  // sync with the typed list.
  const ownerDataSource = [
    { id: UNASSIGNED_ID, label: '(Unassigned)' },
    ...ownerOptions,
  ];

  return (
    <DialogComponent
      ref={dialogRef}
      id="new-request-dialog"
      cssClass="requests-dialog"
      header="New request"
      showCloseIcon
      closeOnEscape
      close={handleDialogClose}
      width="520"
      visible={open}
      target=".app-shell__main"
      animationSettings={{ effect: 'Fade', duration: 200 }}
      footerTemplate={() => (
        <div className="e-dlg-footer-content">
          <ButtonComponent
            cssClass="btn btn--secondary"
            onClick={handleCancel}
            aria-label="Cancel new request"
          >
            Cancel
          </ButtonComponent>
          <ButtonComponent
            cssClass="btn btn--primary"
            onClick={handleSave}
            aria-label="Save new request"
          >
            Save
          </ButtonComponent>
        </div>
      )}
    >
      <form
        className="requests-dialog__form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="requests-dialog__field">
          <label className="requests-dialog__label" htmlFor={TITLE_INPUT_ID}>
            Title
          </label>
          <TextBoxComponent
            id={TITLE_INPUT_ID}
            cssClass="requests-dialog__input"
            placeholder="Briefly describe the request…"
            value={form.title}
            change={handleTitleChange}
            floatLabelType="Never"
          />
          <span className="requests-dialog__error" role="alert">
            {titleError}
          </span>
        </div>

        <div className="requests-dialog__field">
          <label className="requests-dialog__label" htmlFor={PRIORITY_DDL_ID}>
            Priority
          </label>
          <DropDownListComponent
            id={PRIORITY_DDL_ID}
            cssClass="requests-dialog__input"
            dataSource={PRIORITY_OPTIONS as unknown as { [key: string]: object }[]}
            fields={{ text: 'label', value: 'id' }}
            value={form.priority}
            change={handlePriorityChange}
            placeholder="Select a priority"
          />
        </div>

        <div className="requests-dialog__field">
          <label className="requests-dialog__label" htmlFor={OWNER_DDL_ID}>
            Assign to
          </label>
          <DropDownListComponent
            id={OWNER_DDL_ID}
            cssClass="requests-dialog__input"
            dataSource={ownerDataSource as unknown as { [key: string]: object }[]}
            fields={{ text: 'label', value: 'id' }}
            value={form.ownerId ?? UNASSIGNED_ID}
            change={handleOwnerChange}
            placeholder="Select an owner"
          />
        </div>

        <div className="requests-dialog__field">
          <label className="requests-dialog__label" htmlFor={SLA_DDL_ID}>
            SLA
          </label>
          <DropDownListComponent
            id={SLA_DDL_ID}
            cssClass="requests-dialog__input"
            dataSource={slaOptions as unknown as { [key: string]: object }[]}
            fields={{ text: 'label', value: 'id' }}
            value={slaOptions.find((o) => o.chip.text === form.sla.text)?.id ?? 'sla-3d'}
            change={handleSlaChange}
            placeholder="Select an SLA"
          />
        </div>

        <div className="requests-dialog__field">
          <label className="requests-dialog__label" htmlFor={STATUS_DDL_ID}>
            Status
          </label>
          <DropDownListComponent
            id={STATUS_DDL_ID}
            cssClass="requests-dialog__input"
            dataSource={STATUS_OPTIONS as unknown as { [key: string]: object }[]}
            fields={{ text: 'label', value: 'id' }}
            value={form.status}
            change={handleStatusChange}
            placeholder="Select a status"
          />
        </div>
      </form>
    </DialogComponent>
  );
};

export default NewRequestDialog;
