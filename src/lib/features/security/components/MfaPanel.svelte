<script lang="ts">
	import DownloadIcon from '@lucide/svelte/icons/download';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import { toast } from 'svelte-sonner';
	import { api } from '#lib/api/index.js';
	import CopyButton from '#lib/components/shared/CopyButton.svelte';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';
	import Panel from './Panel.svelte';

	type Step = 'idle' | 'password' | 'scan' | 'codes' | 'disable' | 'regenerate';
	let step = $state<Step>('idle');
	let password = $state('');
	let code = $state('');
	let secret = $state('');
	let uri = $state('');
	let codes = $state<string[]>([]);
	let error = $state<string | null>(null);
	let busy = $state(false);
	const enabled = $derived(session.account?.mfa_enabled ?? false);

	function reset(next: Step = 'idle') {
		step = next;
		password = code = '';
		error = null;
		if (next === 'idle') secret = uri = '';
	}

	async function run(fn: () => Promise<void>) {
		busy = true;
		error = null;
		try {
			await fn();
		} catch (err) {
			error = errorMessage(err);
		} finally {
			busy = false;
		}
	}

	const begin = (e: SubmitEvent) => {
		e.preventDefault();
		return run(async () => {
			const res = await api.auth.mfaSetup(password);
			secret = res.secret;
			uri = res.otpauth_uri;
			password = '';
			step = 'scan';
		});
	};

	const confirm = (e: SubmitEvent) => {
		e.preventDefault();
		return run(async () => {
			codes = (await api.auth.mfaEnable(code)).recovery_codes;
			await session.refresh();
			step = 'codes';
			code = secret = uri = '';
			toast.success('Two-factor authentication enabled');
		});
	};

	const disable = (e: SubmitEvent) => {
		e.preventDefault();
		return run(async () => {
			await api.auth.mfaDisable(password, code);
			await session.refresh();
			reset();
			toast.success('Two-factor authentication disabled');
		});
	};

	const regenerate = (e: SubmitEvent) => {
		e.preventDefault();
		return run(async () => {
			codes = (await api.auth.mfaRecoveryCodes(password, code)).recovery_codes;
			password = code = '';
			step = 'codes';
		});
	};

	function download() {
		const blob = new Blob(
			[
				`CachePass recovery codes for ${session.account?.email ?? ''}\nEach code works once.\n\n${codes.join('\n')}\n`
			],
			{ type: 'text/plain' }
		);
		const url = URL.createObjectURL(blob);
		const a = Object.assign(document.createElement('a'), {
			href: url,
			download: 'cachepass-recovery-codes.txt'
		});
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<Panel
	id="mfa"
	title="Two-factor authentication"
	description="Protects sign-in with a code from an authenticator app. It protects your account, not the vault encryption."
>
	{#snippet actions()}
		<Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Enabled' : 'Off'}</Badge>
	{/snippet}
	<div class="space-y-4">
		{#if error}<FormAlert><p>{error}</p></FormAlert>{/if}

		{#if step === 'idle'}
			{#if enabled}
				<div class="flex flex-wrap gap-2">
					<Button variant="outline" onclick={() => reset('regenerate')}>New recovery codes</Button>
					<Button variant="destructive" onclick={() => reset('disable')}>Disable</Button>
				</div>
			{:else}
				<Button onclick={() => reset('password')}>
					<ShieldCheckIcon /> Set up authenticator app
				</Button>
			{/if}
		{:else if step === 'password'}
			<form class="space-y-3" onsubmit={begin}>
				<Field id="mfa-password" label="Confirm your account password">
					<PasswordInput
						id="mfa-password"
						autocomplete="current-password"
						required
						bind:value={password}
					/>
				</Field>
				<div class="flex gap-2">
					<Button type="submit" disabled={busy || !password}>Continue</Button><Button
						type="button"
						variant="ghost"
						onclick={() => reset()}
					>
						Cancel
					</Button>
				</div>
			</form>
		{:else if step === 'scan'}
			<form class="space-y-3" onsubmit={confirm}>
				<p class="text-sm">
					Add this key to your authenticator app (manual entry), then enter the 6-digit code it
					shows.
				</p>
				<div class="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
					<code class="flex-1 font-secret text-sm break-all">
						{secret.match(/.{1,4}/g)?.join(' ')}
					</code>
					<CopyButton value={secret} label="Setup key" secret />
				</div>
				<details class="text-xs text-muted-foreground">
					<summary class="cursor-pointer">Show otpauth:// URI</summary>
					<div class="mt-2 flex items-center gap-2">
						<code class="flex-1 break-all">{uri}</code><CopyButton value={uri} label="URI" secret />
					</div>
				</details>
				<Field id="mfa-code" label="Code from your app">
					<Input
						id="mfa-code"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength={6}
						class="w-32 font-secret tracking-widest"
						required
						bind:value={code}
					/>
				</Field>
				<div class="flex gap-2">
					<Button type="submit" disabled={busy || code.length !== 6}>Enable</Button><Button
						type="button"
						variant="ghost"
						onclick={() => reset()}
					>
						Cancel
					</Button>
				</div>
			</form>
		{:else if step === 'codes'}
			<FormAlert variant="warning">
				<p>
					Save these recovery codes somewhere safe. Each works once if you lose your authenticator.
					They will not be shown again.
				</p>
			</FormAlert>
			<ul class="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/40 p-3 font-secret text-sm">
				{#each codes as c (c)}<li>{c}</li>{/each}
			</ul>
			<div class="flex flex-wrap gap-2">
				<CopyButton value={codes.join('\n')} label="Recovery codes" />
				<Button variant="outline" size="sm" onclick={download}><DownloadIcon /> Download</Button>
				<Button
					size="sm"
					onclick={() => {
						codes = [];
						reset();
					}}
				>
					I saved them
				</Button>
			</div>
		{:else}
			<form class="space-y-3" onsubmit={step === 'disable' ? disable : regenerate}>
				<Field id="mfa-pw2" label="Account password">
					<PasswordInput
						id="mfa-pw2"
						autocomplete="current-password"
						required
						bind:value={password}
					/>
				</Field>
				<Field id="mfa-code2" label="Authenticator or recovery code">
					<Input
						id="mfa-code2"
						autocomplete="one-time-code"
						class="font-secret"
						required
						bind:value={code}
					/>
				</Field>
				<div class="flex gap-2">
					<Button
						type="submit"
						variant={step === 'disable' ? 'destructive' : 'default'}
						disabled={busy || !password || !code}
					>
						{step === 'disable' ? 'Disable two-factor' : 'Generate new codes'}
					</Button>
					<Button type="button" variant="ghost" onclick={() => reset()}>Cancel</Button>
				</div>
			</form>
		{/if}
	</div>
</Panel>
