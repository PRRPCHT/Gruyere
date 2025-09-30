<script lang="ts">
	import {
		PiHoleInstanceStatus,
		SynchronizationMode,
		type Toast,
		type ActionStatus,
		type Settings
	} from '$lib/types/types';
	import Error from '$lib/components/Error.svelte';
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import SuccessToast from '$lib/components/Toast.svelte';
	let { data, form }: PageProps = $props();
	let password = $state('');
	let instanceRefreshInterval = $derived(
		form?.instanceRefreshInterval
			? form.instanceRefreshInterval
			: data.settings.instanceRefreshInterval
	);
	let instanceRefresh = $state(
		form?.isRefreshInstance ? form.isRefreshInstance : data.settings.isRefreshInstance
	);
	let synchronizeWithReference = $state(
		form?.synchronizeWithReference
			? form.synchronizeWithReference
			: data.settings.synchronizeWithReference
	);

	let toasts: Toast[] = $state([]);

	function addToast(success: boolean) {
		let id = toasts.length + 1;
		const message = success ? 'Settings saved successfully' : 'Settings saved failed';
		let status: ActionStatus = {
			success,
			instance: 'Settings',
			message,
			instanceStatus: PiHoleInstanceStatus.ACTIVE
		};
		toasts.push({ id, status });
		const timer = setTimeout(() => {
			toasts = toasts.filter((toast) => toast.id !== id);
		}, 5000);
	}
</script>

<section class="flex flex-col gap-2">
	<h1 class="text-2xl">Settings</h1>
	<form
		class="flex flex-col gap-4"
		method="POST"
		action="?/changeSettings"
		use:enhance={({ formElement, formData, action, cancel }) => {
			return async ({
				result,
				update
			}: {
				result: ActionResult<{ settingsSaved: boolean; settings: Settings }, undefined>;
				update: () => Promise<void>;
			}) => {
				await update();
				if (result.type === 'success' && result.data?.settingsSaved) {
					instanceRefresh = result.data.settings.isRefreshInstance;
					instanceRefreshInterval = result.data.settings.instanceRefreshInterval;
					synchronizeWithReference = result.data.settings.synchronizeWithReference;
					addToast(result.data.settingsSaved);
				} else {
					addToast(false);
				}
			};
		}}
	>
		{#if form?.missingInstanceRefreshInterval}
			<Error message="The instance refresh interval field is required." />
		{/if}
		{#if form?.invalidInstanceRefreshInterval}
			<Error
				message="The instance refresh interval field is invalid. Must be a positive integer."
			/>
		{/if}
		{#if form?.missingSynchronizeWithReference}
			<Error message="The synchronize with reference field is required." />
		{/if}
		<div class="flex flex-row gap-2">
			<label for="instanceRefresh" class="label">Automatic instances refresh: </label>
			<input
				type="checkbox"
				class="checkbox bg-base-100 checkbox-primary"
				bind:checked={instanceRefresh}
				name="isRefreshInstance"
			/>
		</div>
		<div class="flex flex-row gap-2">
			<label for="instanceRefreshInterval" class="label"
				>Instance refresh interval (seconds):
			</label>
			<input
				type="number"
				class="input w-24"
				class:border-error={form?.missingInstanceRefreshInterval ||
					form?.invalidInstanceRefreshInterval}
				class:text-error={form?.missingInstanceRefreshInterval ||
					form?.invalidInstanceRefreshInterval}
				bind:value={instanceRefreshInterval}
				id="instanceRefreshInterval"
				name="instanceRefreshInterval"
				disabled={!instanceRefresh}
			/>
		</div>
		<div class="flex flex-col items-start gap-4 md:flex-row">
			<label for="sync" class="label">Synchronize with reference: </label>
			<div class="flex flex-col gap-2">
				<div id="sync" class="no-wrap flex flex-row gap-2">
					<input
						type="radio"
						class="radio bg-base-100 radio-primary"
						bind:group={synchronizeWithReference}
						id="synchronizeWithReference"
						name="synchronizeWithReference"
						value={SynchronizationMode.PARTIAL}
						checked={synchronizeWithReference === SynchronizationMode.PARTIAL}
						class:border-error={form?.missingSynchronizeWithReference}
						class:text-error={form?.missingSynchronizeWithReference}
					/>
					<label for="synchronizeWithReference" class="label">Only add/update </label>
				</div>

				<div class="no-wrap flex flex-row gap-2">
					<input
						type="radio"
						class="radio bg-base-100 radio-primary"
						bind:group={synchronizeWithReference}
						id="synchronizeWithReference"
						name="synchronizeWithReference"
						value={SynchronizationMode.COMPLETE}
						checked={synchronizeWithReference === SynchronizationMode.COMPLETE}
					/>
					<label for="synchronizeWithReference" class="label">Complete synchronization </label>
				</div>
			</div>
		</div>
		<button class="btn mx-auto w-32 btn-primary" type="submit">Save</button>
	</form>
</section>
<section class="flex flex-col gap-4">
	<h1 class="text-2xl">Security</h1>
	<form
		class="flex flex-col gap-4"
		method="POST"
		action="?/changePassword"
		use:enhance={({ formElement, formData, action, cancel }) => {
			return async ({
				result,
				update
			}: {
				result: ActionResult<{ passwordSaved: boolean; password: string }, undefined>;
				update: () => Promise<void>;
			}) => {
				await update();
				if (result.type === 'success' && result.data?.passwordSaved) {
					password = result.data.password;
					addToast(result.data.passwordSaved);
				} else {
					addToast(false);
				}
			};
		}}
	>
		{#if form?.invalidPassword}
			<Error message="The password field is invalid. Must be at least 6 characters long." />
		{/if}
		<div class="flex flex-col gap-2 md:flex-row">
			<label for="password" class="label">Change password: </label>
			<input
				type="password"
				class="input"
				class:border-error={form?.missingPassword || form?.invalidPassword}
				class:text-error={form?.missingPassword || form?.invalidPassword}
				bind:value={password}
				id="password"
				name="password"
			/>
			<button class="btn btn-primary" type="submit">Submit</button>
		</div>
	</form>
</section>
<section class="flex flex-col gap-4">
	<div class="toast flex flex-col gap-2">
		{#each toasts as toast}
			<SuccessToast status={toast.status} />
		{/each}
	</div>
</section>
