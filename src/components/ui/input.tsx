import * as React from 'react';
import {cn} from '../../lib/utils';

/** Campo shadcn/ui, ajustado para os tokens e formulários da Kurio. */
export function Input({className,type,...props}:React.ComponentProps<'input'>){
 return <input data-slot="input" type={type} className={cn('flex h-10 w-full min-w-0 rounded-md border border-[var(--kurio-border)] bg-[var(--kurio-surface)] px-3 py-2 text-sm text-[var(--kurio-foreground)] placeholder:text-[var(--kurio-secondary)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2',className)} {...props}/>;
}
