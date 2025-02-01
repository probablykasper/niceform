# niceform
Convenient form validation and typing for SvelteKit. Based on Superforms and Zod.

Might turn this into an actual package later

### Example `+page.server.ts`
```ts
import { z } from 'zod'
import { nice_form } from '$lib/niceform'

const schema = z.object({
	name: z.string(),
})

export const actions = {
	async default(event) {
		const form = await nice_form.zod(schema, event)
		if (!form.valid) {
			return form.fail(400)
		}
		if (form.data.name === 'Hi') {
			return form.set_error('name', 'You are a failure')
		}

		return {
      success: true,
		}
	},
}
```

### Example Input wrapper component

Includes type-safe `name` attribute, automatic error messages and label with automatic ID

<img width="644" alt="image" src="https://github.com/user-attachments/assets/f1013bc2-5e61-4a50-b8c4-f3dafa54d3c3" />


```svelte
<script lang="ts" generics="F extends PartialNiceForm">
	import type { HTMLInputAttributes } from 'svelte/elements'
	import { scale, slide } from 'svelte/transition'
	import { backOut } from 'svelte/easing'
	import { sequential_num, type AddFormProps, type PartialNiceForm } from './niceform'

	let {
		form,
		label,
		value = $bindable(),
		...props
	}: AddFormProps<HTMLInputAttributes, F> = $props()

	let errors = $derived(form?.errors ?? {})

	const id = 'input-' + sequential_num()
</script>

<div>
	{#if label}
		<label class="text-label mb-0.5 block text-sm" for={props.id ?? id}>{label}</label>
	{/if}
	<input class={['input', props['class']]} id={label ? id : undefined} bind:value {...props} />
	{#if props.name && errors[props.name]}
		<span class="block origin-top-left" in:scale={{ duration: 250, easing: backOut }}>
			<span class="block text-sm text-red-500" transition:slide={{ duration: 100 }}>
				{errors[props.name]}
			</span>
		</span>
	{/if}
</div>
```

### i18n example
```ts
import { z } from 'zod'
import * as m from '$lib/paraglide/messages'
import { set_error_map } from './niceform'

export const form_errors = set_error_map({
	invalid_email: m.invalid_email,
})

export const email_schema = z.string().email(form_errors.invalid_email).max(100)
```
