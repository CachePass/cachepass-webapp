<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import WandIcon from '@lucide/svelte/icons/wand-sparkles';
	import XIcon from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';
	import Field from '#lib/components/shared/Field.svelte';
	import FormAlert from '#lib/components/shared/FormAlert.svelte';
	import GeneratorPanel from '#lib/components/shared/GeneratorPanel.svelte';
	import PasswordInput from '#lib/components/shared/PasswordInput.svelte';
	import PasswordStrength from '#lib/components/shared/PasswordStrength.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import { parseTotp } from '#lib/features/vault/totp.js';
	import {
		emptyItem,
		itemPayloadSchema,
		ITEM_TYPE_LABELS,
		type ItemPayload
	} from '#lib/schemas/item.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import { vault } from '#lib/stores/vault.svelte.js';
	import { errorMessage } from '#lib/utils/errors.js';

	let draft = $state<ItemPayload | null>(null);
	let errors = $state<Record<string, string>>({});
	let formError = $state<string | null>(null);
	let saving = $state(false);
	let generatorOpen = $state(false);

	const open = $derived(ui.editor.open);
	const editingId = $derived(ui.editor.open && ui.editor.mode === 'edit' ? ui.editor.itemId : null);

	// Load a fresh draft whenever the editor opens.
	$effect(() => {
		const state = ui.editor;
		if (!state.open) {
			draft = null;
			return;
		}
		errors = {};
		formError = null;
		if (state.mode === 'create') {
			draft = emptyItem(state.type, state.folderId);
		} else {
			const entry = vault.entries.get(state.itemId);
			draft = entry ? structuredClone($state.snapshot(entry.data)) : null;
		}
	});

	const folders = $derived(
		[...vault.folders.values()].sort((a, b) => a.name.localeCompare(b.name))
	);

	function setOpen(value: boolean) {
		if (!value) ui.closeEditor();
	}

	function validate(d: ItemPayload): ItemPayload | null {
		const cleaned: ItemPayload = structuredClone($state.snapshot(d));
		if (cleaned.type === 'login') {
			cleaned.login.uris = cleaned.login.uris.map((u) => u.trim()).filter(Boolean);
			if (cleaned.login.totp.trim()) {
				try {
					parseTotp(cleaned.login.totp);
				} catch (err) {
					errors = { totp: err instanceof Error ? err.message : 'Invalid TOTP secret.' };
					return null;
				}
			}
		}
		cleaned.fields = cleaned.fields.filter((f) => f.name.trim() || f.value);
		const parsed = itemPayloadSchema.safeParse(cleaned);
		if (!parsed.success) {
			errors = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message]));
			return null;
		}
		errors = {};
		return parsed.data;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!draft) return;
		const data = validate(draft);
		if (!data) return;
		saving = true;
		formError = null;
		try {
			if (editingId) {
				await vault.updateItem(editingId, data);
				toast.success('Changes saved');
			} else {
				ui.selectedId = await vault.createItem(data);
				toast.success(`${ITEM_TYPE_LABELS[data.type].singular} created`);
			}
			ui.closeEditor();
		} catch (err) {
			formError = errorMessage(err);
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={setOpen}>
	<Dialog.Content class="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-xl">
		{#if draft}
			<Dialog.Header class="border-b px-5 py-4">
				<Dialog.Title>
					{editingId ? 'Edit' : 'New'}
					{ITEM_TYPE_LABELS[draft.type].singular.toLowerCase()}
				</Dialog.Title>
				<Dialog.Description>Encrypted on this device before it is saved.</Dialog.Description>
			</Dialog.Header>
			<form
				id="item-editor"
				class="flex-1 scrollbar-thin space-y-5 overflow-y-auto px-5 py-4"
				onsubmit={save}
				novalidate
			>
				{#if formError}<FormAlert><p>{formError}</p></FormAlert>{/if}

				<Field id="item-name" label="Name" error={errors.name}>
					<Input
						id="item-name"
						bind:value={draft.name}
						required
						maxlength={200}
						aria-invalid={!!errors.name}
						autocomplete="off"
					/>
				</Field>

				{#if draft.type === 'login'}
					<Field id="item-username" label="Username or email">
						<Input
							id="item-username"
							bind:value={draft.login.username}
							autocomplete="off"
							spellcheck="false"
						/>
					</Field>
					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<Label for="item-password">Password</Label>
							<Popover.Root bind:open={generatorOpen}>
								<Popover.Trigger>
									{#snippet child({ props })}
										<Button {...props} type="button" variant="ghost" size="xs">
											<WandIcon /> Generate
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-80" align="end">
									<GeneratorPanel
										onuse={(v: string) => {
											if (draft?.type === 'login') draft.login.password = v;
											generatorOpen = false;
										}}
									/>
								</Popover.Content>
							</Popover.Root>
						</div>
						<PasswordInput
							id="item-password"
							bind:value={draft.login.password}
							autocomplete="new-password"
						/>
						{#if draft.login.password}<PasswordStrength
								password={draft.login.password}
								showFeedback={false}
							/>{/if}
					</div>
					<Field
						id="item-totp"
						label="Authenticator key (TOTP)"
						error={errors.totp}
						hint="Base32 secret or otpauth:// URI. Codes are generated locally."
					>
						<PasswordInput
							id="item-totp"
							bind:value={draft.login.totp}
							autocomplete="off"
							aria-invalid={!!errors.totp}
						/>
					</Field>
					<div class="space-y-1.5">
						<Label>Websites</Label>
						{#each draft.login.uris, i (i)}
							<div class="flex gap-2">
								<Input
									bind:value={draft.login.uris[i]}
									placeholder="https://example.com"
									aria-label={`Website ${i + 1}`}
									inputmode="url"
									spellcheck="false"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`Remove website ${i + 1}`}
									onclick={() => draft?.type === 'login' && draft.login.uris.splice(i, 1)}
								>
									<XIcon />
								</Button>
							</div>
						{/each}
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onclick={() => draft?.type === 'login' && draft.login.uris.push('')}
						>
							<PlusIcon /> Add website
						</Button>
					</div>
				{:else if draft.type === 'card'}
					<Field id="card-holder" label="Cardholder name">
						<Input id="card-holder" bind:value={draft.card.cardholderName} autocomplete="off" />
					</Field>
					<div class="grid grid-cols-3 gap-3">
						<div class="col-span-2">
							<Field id="card-number" label="Number" error={errors['card.number']}>
								<PasswordInput
									id="card-number"
									bind:value={draft.card.number}
									inputmode="numeric"
									autocomplete="off"
									maxlength={32}
								/>
							</Field>
						</div>
						<Field id="card-brand" label="Brand">
							<Input id="card-brand" bind:value={draft.card.brand} autocomplete="off" />
						</Field>
					</div>
					<div class="grid grid-cols-3 gap-3">
						<Field id="card-month" label="Exp. month">
							<Input
								id="card-month"
								bind:value={draft.card.expMonth}
								placeholder="MM"
								maxlength={2}
								inputmode="numeric"
								class="font-secret"
							/>
						</Field>
						<Field id="card-year" label="Exp. year">
							<Input
								id="card-year"
								bind:value={draft.card.expYear}
								placeholder="YYYY"
								maxlength={4}
								inputmode="numeric"
								class="font-secret"
							/>
						</Field>
						<Field id="card-code" label="Security code">
							<PasswordInput
								id="card-code"
								bind:value={draft.card.code}
								maxlength={8}
								autocomplete="off"
							/>
						</Field>
					</div>
				{:else if draft.type === 'identity'}
					<div class="grid grid-cols-2 gap-3">
						<Field id="id-title" label="Title">
							<Input id="id-title" bind:value={draft.identity.title} />
						</Field>
						<Field id="id-company" label="Company">
							<Input id="id-company" bind:value={draft.identity.company} />
						</Field>
						<Field id="id-first" label="First name">
							<Input id="id-first" bind:value={draft.identity.firstName} />
						</Field>
						<Field id="id-middle" label="Middle name">
							<Input id="id-middle" bind:value={draft.identity.middleName} />
						</Field>
						<Field id="id-last" label="Last name">
							<Input id="id-last" bind:value={draft.identity.lastName} />
						</Field>
						<Field id="id-phone" label="Phone">
							<Input id="id-phone" type="tel" bind:value={draft.identity.phone} />
						</Field>
					</div>
					<Field id="id-email" label="Email">
						<Input id="id-email" type="email" bind:value={draft.identity.email} />
					</Field>
					<Field id="id-addr1" label="Address line 1">
						<Input id="id-addr1" bind:value={draft.identity.address1} />
					</Field>
					<Field id="id-addr2" label="Address line 2">
						<Input id="id-addr2" bind:value={draft.identity.address2} />
					</Field>
					<div class="grid grid-cols-2 gap-3">
						<Field id="id-city" label="City">
							<Input id="id-city" bind:value={draft.identity.city} />
						</Field>
						<Field id="id-state" label="State / region">
							<Input id="id-state" bind:value={draft.identity.state} />
						</Field>
						<Field id="id-postal" label="Postal code">
							<Input id="id-postal" bind:value={draft.identity.postalCode} />
						</Field>
						<Field id="id-country" label="Country">
							<Input id="id-country" bind:value={draft.identity.country} />
						</Field>
					</div>
				{:else if draft.type === 'ssh_key'}
					<Field
						id="ssh-private"
						label="Private key"
						hint="Stored encrypted. Paste the full PEM/OpenSSH block."
					>
						<Textarea
							id="ssh-private"
							bind:value={draft.sshKey.privateKey}
							rows={5}
							class="font-secret text-xs"
							spellcheck="false"
							autocomplete="off"
						/>
					</Field>
					<Field id="ssh-public" label="Public key">
						<Textarea
							id="ssh-public"
							bind:value={draft.sshKey.publicKey}
							rows={2}
							class="font-secret text-xs"
							spellcheck="false"
						/>
					</Field>
					<div class="grid grid-cols-2 gap-3">
						<Field id="ssh-fp" label="Fingerprint">
							<Input
								id="ssh-fp"
								bind:value={draft.sshKey.fingerprint}
								class="font-secret"
								spellcheck="false"
							/>
						</Field>
						<Field id="ssh-pass" label="Passphrase">
							<PasswordInput
								id="ssh-pass"
								bind:value={draft.sshKey.passphrase}
								autocomplete="off"
							/>
						</Field>
					</div>
				{/if}

				<Field
					id="item-notes"
					label={draft.type === 'note' ? 'Note' : 'Notes'}
					error={errors.notes}
				>
					<Textarea
						id="item-notes"
						bind:value={draft.notes}
						rows={draft.type === 'note' ? 8 : 3}
						maxlength={20000}
					/>
				</Field>

				<div class="space-y-2">
					<Label>Custom fields</Label>
					{#each draft.fields as field, i (i)}
						<div class="flex items-start gap-2">
							<Input
								bind:value={field.name}
								placeholder="Name"
								aria-label={`Custom field ${i + 1} name`}
								class="w-1/3"
							/>
							{#if field.hidden}
								<div class="flex-1">
									<PasswordInput
										bind:value={field.value}
										aria-label={`Custom field ${i + 1} value`}
										autocomplete="off"
									/>
								</div>
							{:else}
								<Input
									bind:value={field.value}
									placeholder="Value"
									aria-label={`Custom field ${i + 1} value`}
									class="flex-1"
								/>
							{/if}
							<Label class="flex h-8 items-center gap-1.5 text-xs font-normal">
								<Checkbox bind:checked={field.hidden} /> Hidden
							</Label>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={`Remove custom field ${i + 1}`}
								onclick={() => draft?.fields.splice(i, 1)}
							>
								<XIcon />
							</Button>
						</div>
					{/each}
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onclick={() => draft?.fields.push({ name: '', value: '', hidden: false })}
					>
						<PlusIcon /> Add field
					</Button>
				</div>

				<div class="grid gap-4 border-t pt-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="item-folder">Folder</Label>
						<Select.Root
							type="single"
							value={draft.folderId ?? ''}
							onValueChange={(v: string) => draft && (draft.folderId = v || null)}
						>
							<Select.Trigger id="item-folder" class="w-full">
								{draft.folderId
									? (vault.folders.get(draft.folderId)?.name ?? 'No folder')
									: 'No folder'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="" label="No folder">No folder</Select.Item>
								{#each folders as folder (folder.id)}
									<Select.Item value={folder.id} label={folder.name}>{folder.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<Label
						class="flex items-center justify-between gap-2 self-end rounded-lg border px-3 py-2 font-normal"
					>
						Favorite <Switch bind:checked={draft.favorite} />
					</Label>
				</div>
			</form>
			<Dialog.Footer class="border-t px-5 py-3">
				<Button type="button" variant="ghost" onclick={() => ui.closeEditor()}>Cancel</Button>
				<Button type="submit" form="item-editor" disabled={saving}>
					{saving ? 'Encrypting…' : 'Save'}
				</Button>
			</Dialog.Footer>
		{:else if editingId}
			<Dialog.Header class="p-5">
				<Dialog.Title>Item unavailable</Dialog.Title>
				<Dialog.Description>
					This item no longer exists. It may have been deleted on another device.
				</Dialog.Description>
			</Dialog.Header>
		{/if}
	</Dialog.Content>
</Dialog.Root>
