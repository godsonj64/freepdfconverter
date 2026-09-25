import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface PasswordDialogProps {
  fileName: string;
  retry: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({ fileName, retry, onSubmit, onCancel }) => {
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-password-title"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }}
        className="w-full max-w-sm rounded-3xl border border-[#cfcfcf] bg-[var(--paper)] p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--charcoal)] text-white">
          <Lock className="h-5 w-5" />
        </div>
        <h2 id="reader-password-title" className="text-lg font-bold">
          Password required
        </h2>
        <p className="mt-1 break-words text-sm text-[#555]">
          <span className="font-semibold text-[var(--ink)]">{fileName}</span> is encrypted with an open password.
          It is decrypted locally and the password never leaves this tab.
        </p>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={retry}
          aria-label="Document password"
          placeholder="Document password"
          className="editorial-input mt-4"
        />
        {retry && <p className="mt-2 text-xs font-semibold text-red-600">Incorrect password. Try again.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="editorial-btn editorial-btn-tonal py-2">
            Cancel
          </button>
          <button type="submit" className="editorial-btn editorial-btn-dark py-2">
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
};
