import * as React from 'react';
import {cn} from '../../lib/utils';

/** Área multilinha shadcn/ui; preserva os estilos dos formulários existentes. */
export function Textarea({className,...props}:React.ComponentProps<'textarea'>){
 return <textarea data-slot="textarea" className={cn('flex min-h-24 w-full rounded-md border border-[var(--kurio-border)] bg-[var(--kurio-surface)] px-3 py-2 text-sm text-[var(--kurio-foreground)] placeholder:text-[var(--kurio-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',className)} {...props}/>;
}
