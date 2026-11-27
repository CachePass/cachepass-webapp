<script lang="ts">
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import CopyButton from '#lib/components/shared/CopyButton.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Slider } from '#lib/components/ui/slider/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import {
		DEFAULT_PASSPHRASE_OPTIONS,
		DEFAULT_PASSWORD_OPTIONS,
		MAX_LENGTH,
		MIN_LENGTH,
		generatePassphrase,
		generatePassword,
		passphraseEntropyBits,
		passwordEntropyBits,
		type PassphraseOptions,
		type PasswordOptions
	} from '#lib/features/generator/generator.js';
	import { EFF_LARGE_WORDLIST } from '#lib/features/generator/wordlist.js';

	interface Props {
		/** Called with the chosen value when the panel is used inside an editor. */
		onuse?: (value: string) => void;
	}
	let { onuse }: Props = $props();

	let mode = $state<'password' | 'passphrase'>('password');
	let pw = $state<PasswordOptions>({ ...DEFAULT_PASSWORD_OPTIONS });
	let pp = $state<PassphraseOptions>({ ...DEFAULT_PASSPHRASE_OPTIONS });
	let value = $state('');
	let error = $state<string | null>(null);

	function regenerate() {
		try {
			value =
				mode === 'password' ? generatePassword(pw) : generatePassphrase(pp, EFF_LARGE_WORDLIST);
			error = null;
		} catch (err) {
			value = '';
			error = err instanceof Error ? err.message : 'Could not generate.';
		}
	}

	// Regenerate whenever any option changes.
	$effect(() => {
		void [
			mode,
			pw.length,
			pw.lowercase,
			pw.uppercase,
			pw.digits,
			pw.symbols,
			pw.avoidAmbiguous,
			pp.words,
			pp.separator,
			pp.capitalize,
			pp.includeNumber
		];
		regenerate();
	});

	const bits = $derived(
		Math.round(
			mode === 'password'
				? passwordEntropyBits(pw)
				: passphraseEntropyBits(pp, EFF_LARGE_WORDLIST.length)
		)
	);
	const CLASSES = [
		['lowercase', 'a–z'],
		['uppercase', 'A–Z'],
		['digits', '0–9'],
		['symbols', '!@#$']
	] as const;
</script>

<div class="space-y-4">
	<Tabs.Root bind:value={mode}>
		<Tabs.List class="w-full">
			<Tabs.Trigger value="password" class="flex-1">Password</Tabs.Trigger>
			<Tabs.Trigger value="passphrase" class="flex-1">Passphrase</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<div class="rounded-xl border bg-muted/40 p-3">
		<output
			class="block min-h-12 font-secret text-lg leading-relaxed break-all"
			aria-live="polite"
			aria-label="Generated value"
		>
			{value}
		</output>
		<div class="mt-2 flex items-center justify-between">
			<span class="text-xs text-muted-foreground">≈ {bits} bits of entropy</span>
			<div class="flex items-center gap-1">
				<Button variant="ghost" size="icon-sm" aria-label="Generate another" onclick={regenerate}>
					<RefreshCwIcon />
				</Button>
				<CopyButton {value} label={mode === 'password' ? 'Password' : 'Passphrase'} secret />
				{#if onuse}<Button size="sm" onclick={() => onuse?.(value)} disabled={!value}>
						Use
					</Button>{/if}
			</div>
		</div>
	</div>
	{#if error}<p class="text-sm text-destructive" role="alert">{error}</p>{/if}

	{#if mode === 'password'}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<Label for="gen-length">Length</Label>
				<Input
					id="gen-length"
					type="number"
					min={MIN_LENGTH}
					max={MAX_LENGTH}
					class="h-7 w-16 text-right"
					bind:value={pw.length}
				/>
			</div>
			<Slider
				type="single"
				bind:value={pw.length}
				min={MIN_LENGTH}
				max={64}
				step={1}
				aria-label="Password length"
			/>
		</div>
		<div class="grid grid-cols-2 gap-2">
			{#each CLASSES as [key, label] (key)}
				<Label class="flex items-center gap-2 rounded-lg border px-3 py-2 font-normal">
					<Checkbox bind:checked={pw[key]} /> <span class="font-secret">{label}</span>
				</Label>
			{/each}
		</div>
		<Label class="flex items-center gap-2 font-normal">
			<Checkbox bind:checked={pw.avoidAmbiguous} /> Avoid look-alike characters (0 O 1 l I)
		</Label>
	{:else}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<Label for="gen-words">Words</Label>
				<span class="text-sm tabular-nums">{pp.words}</span>
			</div>
			<Slider
				id="gen-words"
				type="single"
				bind:value={pp.words}
				min={4}
				max={12}
				step={1}
				aria-label="Number of words"
			/>
		</div>
		<div class="flex items-center justify-between gap-3">
			<Label for="gen-sep">Separator</Label>
			<Input
				id="gen-sep"
				class="h-7 w-16 text-center font-secret"
				maxlength={3}
				bind:value={pp.separator}
			/>
		</div>
		<Label class="flex items-center gap-2 font-normal">
			<Checkbox bind:checked={pp.capitalize} /> Capitalize words
		</Label>
		<Label class="flex items-center gap-2 font-normal">
			<Checkbox bind:checked={pp.includeNumber} /> Include a number
		</Label>
		<p class="text-xs text-muted-foreground">Words from the EFF Large Wordlist (CC BY 3.0 US).</p>
	{/if}
</div>
