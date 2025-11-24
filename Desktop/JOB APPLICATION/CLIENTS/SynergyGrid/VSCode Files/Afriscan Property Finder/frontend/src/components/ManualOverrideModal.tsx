import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { PropertyRecord } from '../types/property';
import './ManualOverrideModal.css';

type Props = {
  property: PropertyRecord | null;
  onClose: () => void;
  onSave: (payload: Partial<PropertyRecord>) => Promise<void>;
};

export function ManualOverrideModal({ property, onClose, onSave }: Props) {
  const [formState, setFormState] = useState<Partial<PropertyRecord>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (property) {
      setFormState({
        priceValue: property.priceValue,
        rentPerUnit: property.rentPerUnit,
        unitCount: property.unitCount,
        location: property.location,
      });
      setError(null);
    }
  }, [property]);

  if (!property) return null;

  const update = (key: keyof PropertyRecord, value: string) => {
    const numericKeys: (keyof PropertyRecord)[] = ['priceValue', 'rentPerUnit', 'unitCount'];
    setFormState((prev) => ({
      ...prev,
      [key]: numericKeys.includes(key)
        ? value === ''
          ? undefined
          : Number(value)
        : value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await onSave(formState);
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to save override';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <header>
          <h3>Manual override</h3>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <p className="modal-subtitle">Update values when a listing needs clarification or manual input.</p>
        <label>
          Price (numeric)
          <input
            type="number"
            value={formState.priceValue ?? ''}
            onChange={(event) => update('priceValue', event.target.value)}
          />
        </label>
        <label>
          Rent (per unit)
          <input
            type="number"
            value={formState.rentPerUnit ?? ''}
            onChange={(event) => update('rentPerUnit', event.target.value)}
          />
        </label>
        <label>
          Unit count
          <input
            type="number"
            value={formState.unitCount ?? ''}
            onChange={(event) => update('unitCount', event.target.value)}
          />
        </label>
        <label>
          Location
          <input
            value={formState.location ?? ''}
            onChange={(event) => update('location', event.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save override'}
        </button>
      </form>
    </div>
  );
}
