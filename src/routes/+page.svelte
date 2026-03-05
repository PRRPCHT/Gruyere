<script lang="ts">
	import {
		PauseDurationTimeScale,
		type ActionStatus,
		type ClientPiHoleInstance,
		type Toast
	} from '$lib/types/types';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import type { ActionResult } from '@sveltejs/kit';
	import SuccessToast from '$lib/components/Toast.svelte';
	import Error from '$lib/components/Error.svelte';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import InstanceItem from '$lib/components/InstanceItem.svelte';
	let { data, form }: PageProps = $props();
	let piHoleInstances: ClientPiHoleInstance[] = $state(data.instances);
	let showAddInstancePanel = $state(false);
	let newInstanceName = $state('');
	let newInstanceUrl = $state('');
	let newInstanceApiKey = $state('');

	let showPauseDNSBlockingPanel = $state(false);
	let pauseDNSBlockingDuration = $state(1);
	let pauseDNSBlockingTimeScale = $state(PauseDurationTimeScale.MINUTES);
	function showPauseDNSBlockingModal() {
		showPauseDNSBlockingPanel = true;
		pauseDNSBlockingDuration = 1;
	}
	let pauseDNSBlockingError = $state(false);

	async function refreshInstances(newInstances: ClientPiHoleInstance[]) {
		piHoleInstances = newInstances;
	}

	async function resumeDNSBlocking() {
		//await all promises to finish
		let newInstances = piHoleInstances;
		await Promise.all(
			newInstances.map(async (instance) => {
				const result = await fetch('/api/resumeDNSBlocking', {
					method: 'POST',
					body: JSON.stringify({ instanceId: instance.id })
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
		await Promise.all(
			newInstances.map(async (instance) => {
				const result = await fetch('/api/pauseDNSBlocking', {
					method: 'POST',
					body: JSON.stringify({
						duration: pauseDNSBlockingDuration,
						timeScale: pauseDNSBlockingTimeScale,
						instanceId: instance.id
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
			})
		);
		await refreshInstances(newInstances);
	}

	async function pauseDNSBlocking(duration: number, timeScale: PauseDurationTimeScale) {
		let newInstances = piHoleInstances;
		await Promise.all(
			newInstances.map(async (instance) => {
				const result = await fetch('/api/pauseDNSBlocking', {
					method: 'POST',
					body: JSON.stringify({ duration, timeScale, instanceId: instance.id })
				});
				const data = await result.json();
				if (data.status) {
					addToast(data.status);
					instance.status = data.status.instanceStatus;
				}
			})
		);
		await refreshInstances(newInstances);
	}

	let toasts: Toast[] = $state([]);
	let nextToastId = 0;

	function addToast(status: ActionStatus) {
		const id = ++nextToastId;
		toasts.push({ id, status });
		setTimeout(() => {
			toasts = toasts.filter((toast) => toast.id !== id);
		}, 5000);
	}

	async function updateGravities() {
		let newInstances = piHoleInstances;
		await Promise.all(
			newInstances.map(async (instance) => {
				const result = await fetch('/api/updateGravities', {
					method: 'POST',
					body: JSON.stringify({ instanceId: instance.id })
				});
				const data = await result.json();
				if (data.status) {
					addToast(data.status);
				}
			})
		);
		await refreshInstances(newInstances);
	}

	async function restartDNS() {
		let newInstances = piHoleInstances;
		await Promise.all(
			newInstances.map(async (instance) => {
				const result = await fetch('/api/restartDNS', {
					method: 'POST',
					body: JSON.stringify({ instanceId: instance.id })
				});
				const data = await result.json();
				if (data.status) {
					addToast(data.status);
					instance.status = data.status.instanceStatus;
				}
			})
		);
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
</script>

<section class="mb-8 flex flex-col">
	<div class="header flex flex-row justify-between p-2">
		<div class="flex flex-row items-center gap-4 py-2">
			<div class="ps-2 text-lg font-bold">Pi-hole Instances</div>
		</div>
	</div>

	{#each piHoleInstances as piHoleInstance (piHoleInstance.id)}
		<InstanceItem instance={piHoleInstance} {piHoleInstances} />
	{/each}
	<div class="flex flex-row justify-end">
		<!-- <div class="tooltip tooltip-left" data-tip="Add a new Pi-hole instance"> -->
		<button
			class="btn w-48 rounded-none border-none bg-slate-700 hover:bg-slate-600"
			onclick={() => (showAddInstancePanel = !showAddInstancePanel)}>Add new instance</button
		>
		<!-- </div> -->
	</div>

	{#if showAddInstancePanel}
		<dialog id="add_pihole_instance_modal" class="modal-open modal rounded-none">
			<div class="modal-box flex flex-col gap-4 rounded-none">
				<h3 class="text-lg font-bold">Add a new Pi-hole instance</h3>
				<form
					class="flex flex-col gap-2"
					method="post"
					action="?/addPiHoleInstance"
					use:enhance={() => {
						return async ({
							result,
							update
						}: {
							result: ActionResult<
								{ success: boolean; instances: ClientPiHoleInstance[] },
								undefined
							>;
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
							class="input w-full rounded-none"
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
							class="input w-full rounded-none"
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
							class="input w-full rounded-none"
							placeholder="1234567890"
							bind:value={newInstanceApiKey}
							name="apiKey"
							id="instanceApiKey"
							class:border-error={form?.missingApiKey}
						/>
					</div>
					<div class="mt-3 flex w-full flex-row justify-between">
						<button
							class="btn rounded-none btn-ghost"
							onclick={() => (showAddInstancePanel = false)}>Cancel</button
						>
						<button class="btn rounded-none bg-slate-700 hover:bg-slate-600" type="submit">
							Add
						</button>
					</div>
				</form>
			</div>
		</dialog>
	{/if}
</section>
<section class="flex flex-col gap-12">
	<div>
		<div class="header flex flex-row justify-between p-2">
			<div class="flex flex-row items-center gap-4 py-2">
				<div class="ps-2 text-lg font-bold">DNS Blocking - All instances</div>
			</div>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
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

	<div>
		<div class="header flex flex-row justify-between p-2">
			<div class="flex flex-row items-center gap-4 py-2">
				<div class="ps-2 text-lg font-bold">Actions - All instances</div>
			</div>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
			<ActionButton label="Update all Gravities" onClick={() => updateGravities()} />
			<ActionButton label="Restart all DNS" onClick={() => restartDNS()} />
		</div>
	</div>

	<div>
		<div class="header flex flex-row justify-between p-2">
			<div class="flex flex-row items-center gap-4 py-2">
				<div class="ps-2 text-lg font-bold">Actions - From Reference</div>
			</div>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
			<ActionButton label="Update groups" onClick={() => updateGroupsFromReference()} />
			<ActionButton label="Update lists" onClick={() => updateListsFromReference()} />
			<ActionButton label="Update clients" onClick={() => updateClientsFromReference()} />
			<ActionButton label="Update domains" onClick={() => updateDomainsFromReference()} />
		</div>
	</div>

	{#if showPauseDNSBlockingPanel}
		<dialog id="pause_dns_blocking_modal" class="modal-open modal rounded-none">
			<div class="modal-box flex flex-col gap-4 rounded-none">
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
						class="input w-full rounded-none"
						bind:value={pauseDNSBlockingDuration}
						name="duration"
						id="duration"
						class:border-error={pauseDNSBlockingError}
					/>
				</div>
				<div class="flex flex-col gap-2" class:text-error={form?.missingTimeScale}>
					<label class="label" for="timeScale">Time scale</label>
					<select
						class="select w-full rounded-none"
						bind:value={pauseDNSBlockingTimeScale}
						name="timeScale"
						id="timeScale"
					>
						{#each Object.values(PauseDurationTimeScale) as timeScale (timeScale)}
							<option value={timeScale}>{timeScale}</option>
						{/each}
					</select>
				</div>
				<div class="mt-3 flex w-full flex-row justify-between">
					<button
						class="btn rounded-none btn-ghost"
						onclick={() => (showPauseDNSBlockingPanel = false)}>Cancel</button
					>
					<button
						class="btn rounded-none btn-primary"
						onclick={() => pauseDNSBlockingCustomDuration()}
					>
						Pause
					</button>
				</div>
			</div>
		</dialog>
	{/if}
</section>
<section class="flex flex-col gap-4">
	<div class="toast flex flex-col gap-2">
		{#each toasts as toast (toast.id)}
			<SuccessToast status={toast.status} />
		{/each}
	</div>
</section>
