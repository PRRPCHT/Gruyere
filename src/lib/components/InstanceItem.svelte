<script lang="ts">
	import { PiHoleInstanceStatus, type PiHoleInstance } from '$lib/types/types';
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import Error from './Error.svelte';
	import { onDestroy, onMount } from 'svelte';
	let {
		instance,
		piHoleInstances
	}: { instance: PiHoleInstance; piHoleInstances: PiHoleInstance[] } = $props();
	let instanceStatus = $state<PiHoleInstanceStatus>(instance.status);
	let showEditInstancePanel = $state(false);
	let editInstanceName = $state(instance.name);
	let editInstanceUrl = $state(instance.url);
	let editInstanceApiKey = $state(instance.apiKey);
	let editIsReference = $state(instance.isReference);
	let editInstanceId = $state(instance.id);
	let form = $state<Record<string, any>>({});
	// Polling state management
	let refreshInterval: NodeJS.Timeout | null = null;
	let isRefreshing = $state(false);

	function showEditModal() {
		showEditInstancePanel = true;
	}

	async function refreshInstanceStatus() {
		// Prevent multiple simultaneous calls
		if (isRefreshing) {
			console.log('Refresh already in progress, skipping...');
			return;
		}

		isRefreshing = true;
		console.log(new Date().toLocaleTimeString(), 'Refreshing instance status:', instance.name);

		try {
			const result = await fetch('/api/refreshInstanceStatus?id=' + instance.id, {
				method: 'GET'
			});
			const data = await result.json();
			if (data.success) {
				instance = data.instance;
			}
		} catch (error) {
			console.error('Error refreshing instance status:', error);
		} finally {
			isRefreshing = false;
		}
	}

	function startPolling() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}

		refreshInterval = setInterval(() => {
			refreshInstanceStatus();
		}, 10 * 1000);
	}

	function stopPolling() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	onMount(() => {
		refreshInstanceStatus();
		startPolling();
	});

	onDestroy(() => {
		stopPolling();
	});
</script>

<div
	class="flex flex-col justify-between border-b-1 border-slate-600/50 p-2 md:flex-row"
	class:bg-slate-700={instanceStatus === PiHoleInstanceStatus.ACTIVE ||
		instanceStatus === PiHoleInstanceStatus.REFRESHING}
	class:bg-red-800={instanceStatus === PiHoleInstanceStatus.UNAUTHORIZED ||
		instanceStatus === PiHoleInstanceStatus.UNREACHABLE}
	class:border-red-800={instanceStatus === PiHoleInstanceStatus.UNAUTHORIZED ||
		instanceStatus === PiHoleInstanceStatus.UNREACHABLE}
>
	<div class="flex flex-row items-center gap-4 py-2">
		<div class="ps-2 text-lg font-bold">{instance.name}</div>
		<div class="text-sm">
			<a
				href={instance.url + '/admin'}
				target="_blank"
				class="link no-underline hover:text-secondary">{instance.url}</a
			>
		</div>
	</div>
	<div class="flex flex-row items-center gap-2">
		{#if isRefreshing}
			<span class="loading loading-md loading-spinner"></span>
		{/if}
		{#if instance.isReference}
			<div class="badge badge-soft badge-success">Reference</div>
		{/if}
		{#if instanceStatus === PiHoleInstanceStatus.ACTIVE}
			<div class="badge badge-soft badge-success">Active</div>
		{:else if instanceStatus === PiHoleInstanceStatus.UNAUTHORIZED}
			<div class="badge badge-soft badge-error">Unauthorized</div>
		{:else if instanceStatus === PiHoleInstanceStatus.UNREACHABLE}
			<div class="badge badge-soft badge-error">Not active</div>
		{:else}
			<div class="badge badge-soft">Refreshing</div>
		{/if}
		<button class="btn btn-ghost btn-sm" onclick={() => showEditModal()}>Edit</button>
	</div>
</div>

{#if showEditInstancePanel}
	<dialog id="edit_pihole_instance_modal" class="modal-open modal rounded-none">
		<div class="modal-box flex flex-col gap-4 rounded-none">
			<h3 class="text-lg font-bold">Edit Pi-hole instance</h3>
			<form
				class="flex flex-col gap-2"
				method="post"
				action="?/editPiHoleInstance"
				use:enhance={({ formElement, formData, action, cancel }) => {
					return async ({
						result,
						update
					}: {
						result: ActionResult<{ success: boolean; instances: PiHoleInstance[] }, undefined>;
						update: () => Promise<void>;
					}) => {
						await update();
						if (result.type === 'success' && result.data?.success) {
							const updatedInstance = result.data.instances.find(
								(instance) => instance.id === editInstanceId
							);
							if (updatedInstance) {
								instance = updatedInstance;
								instanceStatus = updatedInstance.status;
								editInstanceName = updatedInstance.name;
								editInstanceUrl = updatedInstance.url;
								editInstanceApiKey = updatedInstance.apiKey;
								editIsReference = updatedInstance.isReference;
							}
							showEditInstancePanel = false;
						}
					};
				}}
			>
				<input type="hidden" name="id" value={editInstanceId} />
				{#if form?.missingName}
					<Error message="The name field is required." />
				{/if}
				{#if form?.missingUrl}
					<Error message="The URL field is required." />
				{/if}
				{#if form?.missingApiKey}
					<Error message="The API key field is required." />
				{/if}
				<div class="flex flex-col gap-2" class:text-error={form?.missingName}>
					<label class="label" for="instanceName">Instance name</label>
					<input
						type="text"
						class="input w-full rounded-none"
						bind:value={editInstanceName}
						name="name"
						id="instanceName"
						class:border-error={form?.missingName}
					/>
				</div>
				<div class="flex flex-col gap-2" class:text-error={form?.missingUrl}>
					<label class="label" for="instanceUrl">Instance URL</label>
					<input
						type="text"
						class="input w-full rounded-none"
						bind:value={editInstanceUrl}
						name="url"
						id="instanceUrl"
						class:border-error={form?.missingUrl}
					/>
				</div>
				<div class="flex flex-col gap-2" class:text-error={form?.missingApiKey}>
					<label class="label" for="instanceApiKey">API Key</label>
					<input
						type="text"
						class="input w-full rounded-none"
						bind:value={editInstanceApiKey}
						name="apiKey"
						id="instanceApiKey"
						class:border-error={form?.missingApiKey}
					/>
				</div>
				{#if piHoleInstances.length > 1}
					<div class="flex flex-col gap-2">
						<label class="label" for="isReference">Is Reference</label>
						<select
							class="select w-full rounded-none"
							bind:value={editIsReference}
							name="isReference"
							id="isReference"
						>
							<option value={true}>True</option>
							<option value={false}>False</option>
						</select>
					</div>
				{:else}
					<input type="hidden" name="isReference" bind:value={editIsReference} />
				{/if}
				<div class="mt-3 flex w-full flex-row justify-between">
					<div>
						<button
							class="btn rounded-none btn-ghost"
							onclick={() => (showEditInstancePanel = false)}>Cancel</button
						>
						<button class="btn rounded-none btn-error" formaction="?/deletePiHoleInstance"
							>Delete</button
						>
					</div>

					<button class="btn rounded-none bg-slate-700 hover:bg-slate-600" type="submit">
						Save
					</button>
				</div>
			</form>
		</div>
	</dialog>
{/if}
