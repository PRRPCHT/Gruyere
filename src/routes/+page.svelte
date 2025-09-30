<script lang="ts">
	import {
		PauseDurationTimeScale,
		PiHoleInstanceStatus,
		type ActionStatus,
		type PiHoleInstance,
		type Toast,
		type Settings
	} from '$lib/types/types';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import type { ActionResult } from '@sveltejs/kit';
	import SuccessToast from '$lib/components/Toast.svelte';
	import Error from '$lib/components/Error.svelte';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import { onMount } from 'svelte';
	let { data, form }: PageProps = $props();
	let piHoleInstances: PiHoleInstance[] = $state(data.instances);
	let settings: Settings = $state(data.settings);

	let showAddInstancePanel = $state(false);
	let newInstanceName = $state('');
	let newInstanceUrl = $state('');
	let newInstanceApiKey = $state('');

	let showEditInstancePanel = $state(false);
	let editInstanceName = $state('');
	let editInstanceUrl = $state('');
	let editInstanceApiKey = $state('');
	let editIsReference = $state(false);
	let editInstanceId = $state(0);
	function showEditModal(id: number) {
		showEditInstancePanel = true;
		const instance = piHoleInstances.find((instance) => instance.id === id);
		editInstanceName = instance?.name || '';
		editInstanceUrl = instance?.url || '';
		editInstanceApiKey = instance?.apiKey || '';
		editIsReference = instance?.isReference || false;
		editInstanceId = instance?.id || 0;
	}

	let showPauseDNSBlockingPanel = $state(false);
	let pauseDNSBlockingDuration = $state(1);
	let pauseDNSBlockingTimeScale = $state(PauseDurationTimeScale.MINUTES);
	function showPauseDNSBlockingModal() {
		showPauseDNSBlockingPanel = true;
		pauseDNSBlockingDuration = 1;
	}
	let pauseDNSBlockingError = $state(false);

	async function refreshInstances(newInstances: PiHoleInstance[]) {
		piHoleInstances = newInstances;
	}

	async function refreshInstancesStatus() {
		const result = await fetch('/api/refreshInstancesStatus', {
			method: 'GET'
		});
		const data = await result.json();
		if (data.success) {
			piHoleInstances = data.instances;
		}
		//piHoleInstances = newInstances;
		console.log('Refreshed instances status');
	}

	async function resumeDNSBlocking() {
		//await all promises to finish
		let newInstances = piHoleInstances;
		await Promise.all(
			newInstances.map(async (instance) => {
				const result = await fetch('/api/resumeDNSBlocking', {
					method: 'POST',
					body: JSON.stringify({ instance })
				});
				const data = await result.json();
				if (data.status) {
					addToast(data.status);
				}
				instance.status = data.status.instanceStatus;
			})
		);
		await refreshInstances(newInstances);
	}

	async function pauseDNSBlockingCustomDuration() {
		pauseDNSBlockingError = false;
		let newInstances = piHoleInstances;
		newInstances.forEach(async (instance) => {
			const result = await fetch('/api/pauseDNSBlocking', {
				method: 'POST',
				body: JSON.stringify({
					duration: pauseDNSBlockingDuration,
					timeScale: pauseDNSBlockingTimeScale,
					instance
				})
			});
			const data = await result.json();
			if (data.status) {
				addToast(data.status);
				showPauseDNSBlockingPanel = false;
				pauseDNSBlockingDuration = 1;
				pauseDNSBlockingTimeScale = PauseDurationTimeScale.MINUTES;
			} else {
				pauseDNSBlockingError = true;
			}
		});
		await refreshInstances(newInstances);
	}

	async function pauseDNSBlocking(duration: number, timeScale: PauseDurationTimeScale) {
		let newInstances = piHoleInstances;
		newInstances.forEach(async (instance) => {
			const result = await fetch('/api/pauseDNSBlocking', {
				method: 'POST',
				body: JSON.stringify({ duration, timeScale, instance })
			});
			const data = await result.json();
			if (data.status) {
				addToast(data.status);
				instance.status = data.status.instanceStatus;
			}
		});
		await refreshInstances(newInstances);
	}

	let toasts: Toast[] = $state([]);

	function addToast(status: ActionStatus) {
		let id = toasts.length + 1;
		toasts.push({ id, status });
		const timer = setTimeout(() => {
			toasts = toasts.filter((toast) => toast.id !== id);
		}, 5000);
	}

	async function updateGravities() {
		let newInstances = piHoleInstances;
		newInstances.forEach(async (instance) => {
			const result = await fetch('/api/updateGravities', {
				method: 'POST',
				body: JSON.stringify({ instance })
			});
			const data = await result.json();
			if (data.status) {
				addToast(data.status);
			}
		});
		await refreshInstances(newInstances);
	}

	async function restartDNS() {
		let newInstances = piHoleInstances;
		newInstances.forEach(async (instance) => {
			const result = await fetch('/api/restartDNS', {
				method: 'POST',
				body: JSON.stringify({ instance })
			});
			const data = await result.json();
			if (data.status) {
				addToast(data.status);
				instance.status = data.status.instanceStatus;
			}
		});
		await refreshInstances(newInstances);
	}

	async function updateGroupsFromReference() {
		const result = await fetch('/api/updateGroupsFromReference', {
			method: 'POST',
			body: JSON.stringify({})
		});
		const data = await result.json();
		if (data.success) {
			if (data.status) {
				addToast(data.status);
			}
			if (data.statuses) {
				data.statuses.forEach((status: ActionStatus) => {
					addToast(status);
				});
			}
		}
	}

	async function updateListsFromReference() {
		const result = await fetch('/api/updateListsFromReference', {
			method: 'POST',
			body: JSON.stringify({})
		});
		const data = await result.json();
		if (data.success) {
			if (data.status) {
				addToast(data.status);
			}
		}
		if (data.statuses) {
			data.statuses.forEach((status: ActionStatus) => {
				addToast(status);
			});
		}
	}

	async function updateClientsFromReference() {
		const result = await fetch('/api/updateClientsFromReference', {
			method: 'POST',
			body: JSON.stringify({})
		});
		const data = await result.json();
		if (data.status) {
			addToast(data.status);
		}

		if (data.statuses) {
			data.statuses.forEach((status: ActionStatus) => {
				addToast(status);
			});
		}
	}

	async function updateDomainsFromReference() {
		const result = await fetch('/api/updateDomainsFromReference', {
			method: 'POST',
			body: JSON.stringify({})
		});
		const data = await result.json();
		if (data.status) {
			addToast(data.status);
		}
		if (data.statuses) {
			data.statuses.forEach((status: ActionStatus) => {
				addToast(status);
			});
		}
	}

	onMount(() => {
		refreshInstancesStatus();
		if (settings.isRefreshInstance) {
			setInterval(() => {
				refreshInstancesStatus();
			}, settings.instanceRefreshInterval * 1000);
		}
	});
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl">Pi-hole Instances</h2>
	<div class="verflow-x-auto">
		<table class="table w-full overflow-x-auto">
			<!-- head -->
			<thead>
				<tr>
					<th>Name</th>
					<th>URL</th>
					<th>Is Reference</th>
					<th>Status</th>
					<th> </th>
				</tr>
			</thead>
			<tbody>
				{#each piHoleInstances as piHoleInstance}
					<tr>
						<td>{piHoleInstance.name}</td>
						<td
							><a
								href={piHoleInstance.url + '/admin'}
								target="_blank"
								class="link no-underline hover:text-secondary">{piHoleInstance.url}</a
							></td
						>
						<td
							>{#if piHoleInstance.isReference}<div class="badge badge-soft badge-success">
									Reference
								</div>{/if}</td
						>
						<td
							>{#if piHoleInstance.status === PiHoleInstanceStatus.ACTIVE}
								<div class="badge badge-soft badge-success">Active</div>
							{:else if piHoleInstance.status === PiHoleInstanceStatus.UNAUTHORIZED}
								<div class="badge badge-soft badge-error">Unauthorized</div>
							{:else if piHoleInstance.status === PiHoleInstanceStatus.UNREACHABLE}
								<div class="badge badge-soft badge-error">Not active</div>
							{:else}
								<div class="badge badge-soft">Refreshing</div>
							{/if}
						</td>
						<td class="flex flex-row justify-end">
							<button
								class="btn bg-gray-700 btn-sm hover:bg-primary"
								onclick={() => showEditModal(piHoleInstance.id)}
							>
								Edit
							</button></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="m-4 flex flex-row justify-end gap-2">
			<div class="tooltip tooltip-left" data-tip="Add a new Pi-hole instance">
				<button
					class="btn bg-gray-700 btn-sm hover:bg-primary"
					onclick={() => (showAddInstancePanel = !showAddInstancePanel)}
				>
					+
				</button>
			</div>
		</div>
	</div>
	{#if showEditInstancePanel}
		<dialog id="edit_pihole_instance_modal" class="modal-open modal">
			<div class="modal-box flex flex-col gap-4">
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
								piHoleInstances = result.data.instances;
								showEditInstancePanel = false;
								editInstanceName = '';
								editInstanceUrl = '';
								editInstanceApiKey = '';
								editIsReference = false;
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
							class="input w-full"
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
							class="input w-full"
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
							class="input w-full"
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
								class="select w-full"
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
							<button class="btn btn-ghost" onclick={() => (showEditInstancePanel = false)}
								>Cancel</button
							>
							<button class="btn btn-error" formaction="?/deletePiHoleInstance">Delete</button>
						</div>

						<button class="btn btn-primary" type="submit"> Save </button>
					</div>
				</form>
			</div>
		</dialog>
	{/if}
	{#if showAddInstancePanel}
		<dialog id="add_pihole_instance_modal" class="modal-open modal">
			<div class="modal-box flex flex-col gap-4">
				<h3 class="text-lg font-bold">Add a new Pi-hole instance</h3>
				<form
					class="flex flex-col gap-2"
					method="post"
					action="?/addPiHoleInstance"
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
								piHoleInstances = result.data.instances;
								showAddInstancePanel = false;
								newInstanceName = '';
								newInstanceUrl = '';
								newInstanceApiKey = '';
							}
						};
					}}
				>
					{#if form?.missingName}
						<Error message="The name field is required." />
					{/if}
					{#if form?.missingUrl}
						<Error message="The URL field is required." />
					{/if}
					{#if form?.missingApiKey}
						<Error message="The API key field is required." />
					{/if}
					<div class:text-error={form?.missingName}>
						<label class="label" for="instanceName">Instance name</label>
						<input
							type="text"
							class="input w-full"
							placeholder="Instance name"
							bind:value={newInstanceName}
							name="name"
							id="instanceName"
							class:border-error={form?.missingName}
						/>
					</div>
					<div class:text-error={form?.missingUrl}>
						<label class="label" for="instanceUrl">Instance URL</label>
						<input
							type="text"
							class="input w-full"
							placeholder="https://pihole.example.com:port"
							bind:value={newInstanceUrl}
							name="url"
							id="instanceUrl"
							class:border-error={form?.missingUrl}
						/>
					</div>
					<div class:text-error={form?.missingApiKey}>
						<label class="label" for="instanceApiKey">API Key</label>
						<input
							type="text"
							class="input w-full"
							placeholder="1234567890"
							bind:value={newInstanceApiKey}
							name="apiKey"
							id="instanceApiKey"
							class:border-error={form?.missingApiKey}
						/>
					</div>
					<div class="mt-3 flex w-full flex-row justify-between">
						<button class="btn btn-ghost" onclick={() => (showAddInstancePanel = false)}
							>Cancel</button
						>
						<button class="btn btn-primary" type="submit"> Add </button>
					</div>
				</form>
			</div>
		</dialog>
	{/if}
</section>
<section class="flex flex-col gap-4">
	<div class="flex flex-col gap-8">
		<div class="flex flex-col gap-4">
			<h2 class="text-2xl">DNS Blocking - All instances</h2>
			<div class="flex flex-row flex-wrap gap-2">
				<ActionButton
					label="Indefinitely"
					onClick={() => pauseDNSBlocking(999, PauseDurationTimeScale.MINUTES)}
				/>
				<ActionButton
					label="For 10 seconds"
					onClick={() => pauseDNSBlocking(10, PauseDurationTimeScale.SECONDS)}
				/>
				<ActionButton
					label="For 30 seconds"
					onClick={() => pauseDNSBlocking(30, PauseDurationTimeScale.SECONDS)}
				/>
				<ActionButton
					label="For 5 minutes"
					onClick={() => pauseDNSBlocking(5, PauseDurationTimeScale.MINUTES)}
				/>
				<ActionButton label="Custom time" onClick={() => showPauseDNSBlockingModal()} />
				<ActionButton label="Resume Blocking" onClick={() => resumeDNSBlocking()} />
			</div>
		</div>

		<div class="flex flex-col gap-4">
			<h3 class="text-2xl">Actions - All instances</h3>
			<div class="flex flex-row flex-wrap gap-2">
				<ActionButton label="Update all Gravities" onClick={() => updateGravities()} />
				<ActionButton label="Restart all DNS" onClick={() => restartDNS()} />
			</div>
		</div>
		<div class="flex flex-col gap-4">
			<h3 class="text-2xl">Actions - From Reference</h3>
			<div class="flex flex-row flex-wrap gap-2">
				<ActionButton label="Update groups" onClick={() => updateGroupsFromReference()} />
				<ActionButton label="Update lists" onClick={() => updateListsFromReference()} />
				<ActionButton label="Update clients" onClick={() => updateClientsFromReference()} />
				<ActionButton label="Update domains" onClick={() => updateDomainsFromReference()} />
			</div>
		</div>
	</div>
	{#if showPauseDNSBlockingPanel}
		<dialog id="pause_dns_blocking_modal" class="modal-open modal">
			<div class="modal-box flex flex-col gap-4">
				<h3 class="text-lg font-bold">Pause DNS Blocking</h3>

				{#if pauseDNSBlockingError}
					<Error
						message="The duration field is required and must be a number (integer) greater than 0."
					/>
				{/if}
				{#if form?.missingTimeScale}
					<Error message="The time scale field is required." />
				{/if}
				<div class="flex flex-col gap-2" class:text-error={pauseDNSBlockingError}>
					<label class="label" for="duration">Duration</label>
					<input
						type="number"
						class="input w-full"
						bind:value={pauseDNSBlockingDuration}
						name="duration"
						id="duration"
						class:border-error={pauseDNSBlockingError}
					/>
				</div>
				<div class="flex flex-col gap-2" class:text-error={form?.missingTimeScale}>
					<label class="label" for="timeScale">Time scale</label>
					<select
						class="select w-full"
						bind:value={pauseDNSBlockingTimeScale}
						name="timeScale"
						id="timeScale"
					>
						{#each Object.values(PauseDurationTimeScale) as timeScale}
							<option value={timeScale}>{timeScale}</option>
						{/each}
					</select>
				</div>
				<div class="mt-3 flex w-full flex-row justify-between">
					<button class="btn btn-ghost" onclick={() => (showPauseDNSBlockingPanel = false)}
						>Cancel</button
					>
					<button class="btn btn-primary" onclick={() => pauseDNSBlockingCustomDuration()}>
						Pause
					</button>
				</div>
			</div>
		</dialog>
	{/if}
</section>
<section class="flex flex-col gap-4">
	<div class="toast flex flex-col gap-2">
		{#each toasts as toast}
			<SuccessToast status={toast.status} />
		{/each}
	</div>
</section>
