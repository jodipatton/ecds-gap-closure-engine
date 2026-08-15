export function Stepper({ steps, current }: { steps: Array<{ label: string }>; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className={[
                'grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold',
                state === 'done' ? 'bg-emerald-500 text-white' :
                state === 'active' ? 'bg-accent text-white' :
                'bg-slate-200 text-slate-500'
              ].join(' ')}
            >
              {state === 'done' ? '✓' : i + 1}
            </span>
            <span className={state === 'active' ? 'font-medium text-ink' : 'text-slate-500'}>{s.label}</span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-slate-300" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
