import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";

import { useAdminTheme } from "@/components/admin/admin-design";

type Props = { value: string; onChange: (digits: string) => void; label: string; disabled?: boolean };
type DigitSelection = { start: number; end: number };

function formatAmount(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function countDigits(text: string) {
  return text.replace(/\D/g, "").length;
}

function caretPosition(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let count = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted[index]) && ++count === digitCount) return index + 1;
  }
  return formatted.length;
}

function readEdit(text: string, start: number, end: number, inputType: string, previous: string) {
  let digits = text.replace(/\D/g, "");
  let startDigit = countDigits(text.slice(0, start));
  let endDigit = countDigits(text.slice(0, end));

  // Deleting only a separator should delete its adjacent digit, rather than
  // restoring the separator and leaving the user stuck at the same position.
  if (digits === previous && start === end) {
    const index = inputType === "deleteContentBackward" ? startDigit - 1 : inputType === "deleteContentForward" ? startDigit : -1;
    if (index >= 0 && index < digits.length) {
      digits = digits.slice(0, index) + digits.slice(index + 1);
      if (inputType === "deleteContentBackward") startDigit--;
      endDigit = startDigit;
    }
  }

  const normalized = digits.replace(/^0+(?=\d)/, "");
  const removedZeros = digits.length - normalized.length;
  return { digits: normalized, selection: { start: Math.max(0, startDigit - removedZeros), end: Math.max(0, endDigit - removedZeros) } };
}

/** Display grouped VND amounts while keeping the form/API value as raw digits. */
export function VndAmountInput({ value, onChange, label, disabled = false }: Props) {
  const theme = useAdminTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<DigitSelection | null>(null);
  const formatted = formatAmount(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (selection && input && input.ownerDocument.activeElement === input) {
      input.setSelectionRange(caretPosition(formatted, selection.start), caretPosition(formatted, selection.end));
    }
  }, [formatted, selection]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const input = event.currentTarget;
    const nativeEvent = event.nativeEvent as InputEvent;
    const edit = readEdit(input.value, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length, nativeEvent.inputType ?? "", value);
    setSelection(edit.selection);
    onChange(edit.digits);
  }

  return <input ref={inputRef} type="text" inputMode="numeric" aria-label={label} disabled={disabled} value={formatted} onChange={handleChange}
    autoComplete="off" spellCheck={false}
    style={{ width: "100%", minWidth: 0, minHeight: 42, boxSizing: "border-box", padding: 12, border: `1px solid ${theme.border}`,
      borderRadius: 7, backgroundColor: theme.inputBackground, color: theme.text, outlineColor: theme.primary,
      fontFamily: "AdminInter, system-ui, sans-serif", fontSize: 13, opacity: disabled ? 0.5 : 1 }} />;
}
