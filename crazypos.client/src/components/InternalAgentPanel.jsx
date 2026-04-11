import React, { useEffect, useState } from 'react';
import { getInternalAgentHealth } from '../utils/internalAgent';

export function InternalAgentPanel({ onRunCommand, lastMessage, isBusy }) {
    const [command, setCommand] = useState('');
    const [apiType, setApiType] = useState('unknown');
    const [modelAvailable, setModelAvailable] = useState(null);

    useEffect(() => {
        let disposed = false;

        const fetchHealth = async () => {
            try {
                const health = await getInternalAgentHealth();
                if (disposed) {
                    return;
                }

                const nextType = typeof health?.apiType === 'string' && health.apiType.trim()
                    ? health.apiType.trim()
                    : 'unknown';
                setApiType(nextType);
                setModelAvailable(health?.modelAvailable ?? null);
            } catch {
                if (!disposed) {
                    setApiType('unreachable');
                    setModelAvailable(null);
                }
            }
        };

        fetchHealth();
        const intervalId = window.setInterval(fetchHealth, 15000);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, []);

    const badgeClassName =
        apiType === 'ollama'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : apiType === 'openai-compatible'
                ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                : apiType === 'unreachable'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200';

    const modelStatusText = modelAvailable === true ? '✓ ok' : modelAvailable === false ? '✗ missing' : '? unknown';

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!command.trim() || isBusy) {
            return;
        }

        await onRunCommand(command.trim());
        setCommand('');
    };

    return (
        <section className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-blue-900">Internal AI Command (Local)</h2>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${badgeClassName}`}>
                    {apiType} | {modelStatusText}
                </span>
            </div>
            <p className="mt-1 text-xs text-blue-800">
                Uses your internal model endpoint, so no paid external key is required.
            </p>

            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder="Try: open analytics"
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
                <button
                    type="submit"
                    disabled={isBusy || !command.trim()}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isBusy ? 'Running...' : 'Run'}
                </button>
            </form>

            {lastMessage ? (
                <p className="mt-2 text-xs text-blue-900">{lastMessage}</p>
            ) : null}
        </section>
    );
}
