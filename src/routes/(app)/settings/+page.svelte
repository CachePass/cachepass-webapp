<script lang="ts">
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { api } from '#lib/api/index.js';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import Panel from '#lib/features/security/components/Panel.svelte';
	import { handleSessionExpired } from '#lib/features/vault/actions.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { AUTO_LOCK_OPTIONS, CLIPBOARD_OPTIONS, settings } from '#lib/stores/settings.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';

	let name = $state(session.account?.name ?? '');
	let savingName = $state(false);

	let deleteOpen = $state(false);
	let deletePassword = $state('');
	let deleteCode = $state('');
	let deleteConfirm = $state('');
	let deleteError = $state<string | null>(null);
	let deleting = $state(false);

	const lockLabel = (m: number) =>
		m >= 60 ? `${m / 60} hour${m > 60 ? 's' : ''}` : `${m} minute${m > 1 ? 's' : ''}`;
	const clipLabel = (s: number) =>
		s === 0 ? 'Never' : s >= 60 ? `${s / 60} minute${s > 60 ? 's' : ''}` : `${s} seconds`;

	async function saveName(event: SubmitEvent) {
		event.preventDefault();
		savingName = true;
		try {
			session.set(await api.account.update(name.trim() || null));
			toast.success('Profile updated');
		} catch (err) {
			toast.error(errorMessage(err));
		} finally {
			savingName = false;
		}
	}

	async function deleteAccount(event: SubmitEvent) {
		event.preventDefault();
		deleting = true;
		deleteError = null;
		try {
			await api.account.remove(deletePassword, deleteCode || undefined);
			deleteOpen = false;
			toast.success('Your account and vault were deleted.');
			await handleSessionExpired();
		} catch (err) {
			deleteError = errorMessage(err);
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head><title>Settings · CachePass</title></svelte:head>

<div class="h-full scrollbar-thin overflow-y-auto">
	<div class="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
		<h1 class="text-xl font-semibold tracking-tight">Settings</h1>

		<Panel title="Appearance">
			<div class="flex items-center justify-between gap-4">
				<Label for="theme">Theme</Label>
				<Select.Root
					type="single"
					value={userPrefersMode.current}
					onValueChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
				>
					<Select.Trigger id="theme" class="w-40 capitalize">
						{userPrefersMode.current}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="system" label="System">System</Select.Item>
						<Select.Item value="light" label="Light">Light</Select.Item>
						<Select.Item value="dark" label="Dark">Dark</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Panel>

		<Panel
			title="Vault locking"
			description="Locking destroys the decryption key in this browser. Unlock again with your master password."
		>
			<div class="space-y-4">
				<div class="flex items-center justify-between gap-4">
					<Label for="autolock">Lock after inactivity</Label>
					<Select.Root
						type="single"
						value={String(settings.value.autoLockMinutes)}
						onValueChange={(v) => settings.update({ autoLockMinutes: Number(v) })}
					>
						<Select.Trigger id="autolock" class="w-40">
							{lockLabel(settings.value.autoLockMinutes)}
						</Select.Trigger>
						<Select.Content>
							{#each AUTO_LOCK_OPTIONS as m (m)}<Select.Item value={String(m)} label={lockLabel(m)}>
									{lockLabel(m)}
								</Select.Item>{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex items-center justify-between gap-4">
					<Label for="lock-hidden" class="flex-col items-start gap-0.5">
						<span>Lock when this tab is hidden</span>
						<span class="text-xs font-normal text-muted-foreground">
							Switching tabs or minimising locks the vault.
						</span>
					</Label>
					<Switch
						id="lock-hidden"
						checked={settings.value.lockOnHidden}
						onCheckedChange={(v: boolean) => settings.update({ lockOnHidden: v })}
					/>
				</div>
				<div class="flex items-center justify-between gap-4">
					<Label for="clipboard" class="flex-col items-start gap-0.5">
						<span>Clear copied secrets</span>
						<span class="text-xs font-normal text-muted-foreground">
							Best effort: browsers only allow this while the page has focus.
						</span>
					</Label>
					<Select.Root
						type="single"
						value={String(settings.value.clipboardClearSeconds)}
						onValueChange={(v) => settings.update({ clipboardClearSeconds: Number(v) })}
					>
						<Select.Trigger id="clipboard" class="w-40">
							{clipLabel(settings.value.clipboardClearSeconds)}
						</Select.Trigger>
						<Select.Content>
							{#each CLIPBOARD_OPTIONS as s (s)}<Select.Item value={String(s)} label={clipLabel(s)}>
									{clipLabel(s)}
								</Select.Item>{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</Panel>

		<Panel title="Profile">
			<form class="flex items-end gap-3" onsubmit={saveName}>
				<div class="flex-1">
					<Field id="display-name" label="Display name">
						<Input id="display-name" bind:value={name} maxlength={100} autocomplete="name" />
					</Field>
				</div>
				<Button type="submit" variant="outline" disabled={savingName}>Save</Button>
			</form>
			<p class="mt-3 text-sm text-muted-foreground">
				Email: <span class="text-foreground">{session.account?.email}</span>
			</p>
		</Panel>

		<Panel
			title="Delete account"
			description="Permanently deletes your account, vault, folders, sessions and devices from this server."
		>
			<Button variant="destructive" onclick={() => (deleteOpen = true)}>Delete account…</Button>
		</Panel>
	</div>
</div>

<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete account and vault</Dialog.Title>
			<Dialog.Description>
				This cannot be undone. Export anything you need first. Earlier server backups may still
				contain encrypted copies until they expire.
			</Dialog.Description>
		</Dialog.Header>
		<form class="space-y-4" onsubmit={deleteAccount}>
			{#if deleteError}<FormAlert><p>{deleteError}</p></FormAlert>{/if}
			<Field id="del-password" label="Account password">
				<PasswordInput
					id="del-password"
					autocomplete="current-password"
					required
					bind:value={deletePassword}
				/>
			</Field>
			{#if session.account?.mfa_enabled}
				<Field id="del-code" label="Two-factor code">
					<Input
						id="del-code"
						autocomplete="one-time-code"
						class="font-secret"
						bind:value={deleteCode}
					/>
				</Field>
			{/if}
			<Field id="del-confirm" label="Type DELETE to confirm">
				<Input id="del-confirm" bind:value={deleteConfirm} autocomplete="off" />
			</Field>
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (deleteOpen = false)}>Cancel</Button>
				<Button
					type="submit"
					variant="destructive"
					disabled={deleting || deleteConfirm !== 'DELETE' || !deletePassword}
				>
					Delete permanently
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
