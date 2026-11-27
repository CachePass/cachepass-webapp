<script lang="ts">
	import AccountPasswordForm from '#lib/features/security/components/AccountPasswordForm.svelte';
	import ActivityPanel from '#lib/features/security/components/ActivityPanel.svelte';
	import MasterPasswordForm from '#lib/features/security/components/MasterPasswordForm.svelte';
	import MfaPanel from '#lib/features/security/components/MfaPanel.svelte';
	import SessionsPanel from '#lib/features/security/components/SessionsPanel.svelte';
	import VaultHealth from '#lib/features/security/components/VaultHealth.svelte';

	let sessionsVersion = $state(0);
</script>

<svelte:head><title>Security · CachePass</title></svelte:head>

<div class="h-full scrollbar-thin overflow-y-auto">
	<div class="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Security</h1>
			<p class="text-sm text-muted-foreground">
				Your master password protects the vault; your account password and 2FA protect sign-in.
			</p>
		</div>
		<VaultHealth />
		<MasterPasswordForm />
		<AccountPasswordForm onchanged={() => sessionsVersion++} />
		<MfaPanel />
		<SessionsPanel version={sessionsVersion} />
		<ActivityPanel />
	</div>
</div>
