import { fail, type RequestEvent } from '@sveltejs/kit'
import {
	setError,
	superValidate,
	type FormPathLeavesWithErrors,
	type Infer,
	type ValidationErrors,
} from 'sveltekit-superforms'
import { zod as zod_adapter } from 'sveltekit-superforms/adapters'

export type FormInput = RequestEvent | Request | FormData | URLSearchParams | null | undefined
export type ZodSchema = Parameters<typeof zod_adapter>[0]

// For AddFormProps to get name attribute type validation, and to read errors
export type PartialNiceForm = {
	data?: Record<string, unknown>
	errors?: Record<string, string[]>
} | null

export type AddFormProps<
	// The unrelated props
	T extends object,
	// Partially defined form property. Allow null because SvelteKit's form prop is nullable
	F extends PartialNiceForm | null,
> =
	// Props without form
	| (Omit<T, 'form'> & {
			form?: undefined
			label?: string
	  })
	// Props with form
	| (Omit<T, 'form'> & {
			// Allow null because SvelteKit's form prop is nullable
			form: F
			// Get the full combined `data` property of the form. This also gets around cases where a form action returns its own custom data, in which case `data` would not be defined
			name: F extends { data: Record<string, unknown> } ? keyof F['data'] : never
			label?: string
	  })

let id_n = 0
export function sequential_num() {
	return id_n++
}

export type NiceForm<Z extends ZodSchema> = {
	valid: boolean
	data: Infer<Z>
	errors: ValidationErrors<Infer<Z>>
	message?: string
	single_error_message?: string
}
type NiceFormServer<Z extends ZodSchema> = NiceForm<Z> & {
	form: NiceForm<Z>
	/** Adds the form as a property to the data object */
	fail: <D extends Record<string, unknown> | string>(
		status: number,
		data?: D,
	) => D extends string ? NiceForm<Z> & { message: D } : NiceForm<Z> & D
	success: <D extends Record<string, unknown> | string>(
		data?: D,
	) => D extends string ? NiceForm<Z> & { message: D } : NiceForm<Z> & D
	set_error: (
		name: FormPathLeavesWithErrors<Infer<Z>>,
		message: string,
		options?: Parameters<typeof setError>[3],
	) => NiceForm<Z>
}

let error_map: Record<string, () => string> = {}

export function set_error_map<K extends string>(map: Record<K, () => string>) {
	error_map = map
	return Object.fromEntries(Object.entries(map).map(([key]) => [key, key])) as Record<K, K>
}

async function zod<Z extends ZodSchema, D extends FormInput | undefined>(
	schema: Z,
	data?: D,
): Promise<D extends object ? NiceFormServer<Z> : NiceForm<Z>> {
	if (data) {
		const sf_form = await superValidate(data, zod_adapter(schema), { strict: true )
		let translated_single_error_message = ''
		let single_error_message = ''
		for (const [key, field_errors] of Object.entries(sf_form.errors)) {
			for (let i = 0; i < field_errors.length; i++) {
				const msg = field_errors[i]
				if (error_map[msg]) {
					field_errors[i] = error_map[msg]()
					translated_single_error_message += `${key}: ${field_errors[i]}\n`
				}
				single_error_message += `${key}: ${field_errors[i]}\n`
			}
		}
		const form: NiceForm<Z> = {
			valid: sf_form.valid,
			data: sf_form.data,
			errors: sf_form.errors,
			single_error_message: translated_single_error_message || single_error_message || undefined,
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return <any>{
			...form,
			form,
			fail(status: number, data: Record<string, unknown> | string = {}) {
				if (typeof data === 'string') {
					return fail(status, { ...form, message: data })
				}
				return fail(status, { ...form, ...data })
			},
			success(data: Record<string, unknown> | string = {}) {
				if (typeof data === 'string') {
					return { ...form, message: data }
				}
				return { ...form, ...data }
			},
			set_error(
				name: FormPathLeavesWithErrors<Infer<Z, 'zod'>>,
				message: string,
				options?: Parameters<typeof setError>[3],
			) {
				const sf_form2 = setError(sf_form, name, message, options)
				return fail(sf_form2.status, { ...form })
			},
		}
	} else {
		const sf_form = await superValidate(zod_adapter(schema), { strict: true })
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return <any>{
			valid: sf_form.valid,
			data: sf_form.data,
			errors: sf_form.errors,
		}
	}
}

export const nice_form = {
	zod,
}

export function auto_snapshot() {
	let container_el: HTMLElement | undefined
	const selector = 'input[data-snapshot],textarea[data-snapshot],select[data-snapshot]'
	return {
		capture() {
			if (!container_el?.querySelectorAll) {
				throw new Error('auto_snapshot: container element not set')
			}
			const elements = container_el.querySelectorAll(selector)
			const values: Record<string, string> = {}
			for (const element of elements) {
				if (
					element instanceof HTMLInputElement ||
					element instanceof HTMLSelectElement ||
					element instanceof HTMLTextAreaElement
				) {
					values[element.name] = element.value
				}
			}
			return values
		},
		restore(value: Record<string, string>) {
			if (!container_el?.querySelectorAll) {
				throw new Error('auto_snapshot: container element not set')
			}
			const elements = container_el.querySelectorAll(selector)
			for (const element of elements) {
				if (
					(element instanceof HTMLInputElement ||
						element instanceof HTMLSelectElement ||
						element instanceof HTMLTextAreaElement) &&
					value[element.name]
				) {
					element.value = value[element.name]
					// Trigger Svelte state to updates
					element.dispatchEvent(new Event('input'))
				}
			}
		},
		container(node: HTMLElement) {
			container_el = node
		},
	}
}
