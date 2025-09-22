<script lang="ts">
	import { PiHoleInstanceStatus, type PiHoleInstance } from '$lib/types/types';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import type { ActionResult } from '@sveltejs/kit';
	let { data, form }: PageProps = $props();
	let piHoleInstances: PiHoleInstance[] = $state(data.instances);

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
</script>

<section class="flex flex-col gap-8">
	<div class="flex flex-col gap-4">
		<h2 class="text-2xl">Pi-hole Instances</h2>
		<div class="verflow-x-auto">
			<table class="table">
				<!-- head -->
				<thead>
					<tr>
						<th>Name</th>
						<th>URL</th>
						<th>Is Reference</th>
						<th>Status</th>
						<th>Actions</th>
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
									class="link no-underline hover:underline">{piHoleInstance.url}</a
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
								{:else}
									<div class="badge badge-soft badge-error">Not active</div>
								{/if}
							</td>
							<td>
								<button
									class="btn btn-ghost btn-soft btn-sm"
									onclick={() => showEditModal(piHoleInstance.id)}
								>
									Edit
								</button></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="mt-4 flex flex-row justify-center gap-2">
				<button
					class="btn btn-soft btn-primary"
					onclick={() => (showAddInstancePanel = !showAddInstancePanel)}
				>
					Add Pi-hole instance
				</button>
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
								console.log(result);
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
							<div role="alert" class="alert-soft alert alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 shrink-0 stroke-current"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>The name field is required.</span>
							</div>
						{/if}
						{#if form?.missingUrl}
							<div role="alert" class="alert-soft alert alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 shrink-0 stroke-current"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>The URL field is required.</span>
							</div>
						{/if}
						{#if form?.missingApiKey}
							<div role="alert" class="alert-soft alert alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 shrink-0 stroke-current"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>The API key field is required.</span>
							</div>
						{/if}
						<div class="flex flex-col gap-2" class:text-error={form?.missingName}>
							<label class="label">Instance name</label>
							<input
								type="text"
								class="input w-full"
								bind:value={editInstanceName}
								name="name"
								class:border-error={form?.missingName}
							/>
						</div>
						<div class="flex flex-col gap-2" class:text-error={form?.missingUrl}>
							<label class="label">Instance URL</label>
							<input
								type="text"
								class="input w-full"
								bind:value={editInstanceUrl}
								name="url"
								class:border-error={form?.missingUrl}
							/>
						</div>
						<div class="flex flex-col gap-2" class:text-error={form?.missingApiKey}>
							<label class="label">API Key</label>
							<input
								type="text"
								class="input w-full"
								bind:value={editInstanceApiKey}
								name="apiKey"
								class:border-error={form?.missingApiKey}
							/>
						</div>
						<div class="flex flex-col gap-2">
							<label class="label">Is Reference</label>
							<select class="select w-full" bind:value={editIsReference} name="isReference">
								<option value={true}>True</option>
								<option value={false}>False</option>
							</select>
						</div>
						<div class="mt-3 flex w-full flex-row justify-between">
							<div>
								<button
									class="btn btn-ghost btn-soft"
									onclick={() => (showEditInstancePanel = false)}>Cancel</button
								>
								<button class="btn btn-error" formaction="?/deletePiHoleInstance">Delete</button>
							</div>

							<button class="btn btn-primary" type="submit"> Edit </button>
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
								console.log(result);
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
							<div role="alert" class="alert-soft alert alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 shrink-0 stroke-current"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>The name field is required.</span>
							</div>
						{/if}
						{#if form?.missingUrl}
							<div role="alert" class="alert-soft alert alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 shrink-0 stroke-current"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>The URL field is required.</span>
							</div>
						{/if}
						{#if form?.missingApiKey}
							<div role="alert" class="alert-soft alert alert-error">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 shrink-0 stroke-current"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>The API key field is required.</span>
							</div>
						{/if}
						<div class:text-error={form?.missingName}>
							<label class="label">Instance name</label>
							<input
								type="text"
								class="input w-full"
								placeholder="Instance name"
								bind:value={newInstanceName}
								name="name"
								class:border-error={form?.missingName}
							/>
						</div>
						<div class:text-error={form?.missingUrl}>
							<label class="label">Instance URL</label>
							<input
								type="text"
								class="input w-full"
								placeholder="https://pihole.example.com:port"
								bind:value={newInstanceUrl}
								name="url"
								class:border-error={form?.missingUrl}
							/>
						</div>
						<div class:text-error={form?.missingApiKey}>
							<label class="label">API Key</label>
							<input
								type="text"
								class="input w-full"
								placeholder="1234567890"
								bind:value={newInstanceApiKey}
								name="apiKey"
								class:border-error={form?.missingApiKey}
							/>
						</div>
						<div class="mt-3 flex w-full flex-row justify-between">
							<button class="btn btn-ghost btn-soft" onclick={() => (showAddInstancePanel = false)}
								>Cancel</button
							>
							<button class="btn btn-primary" type="submit"> Add </button>
						</div>
					</form>
				</div>
			</dialog>
		{/if}
	</div>
	<div class="flex flex-col gap-4">
		<h2 class="text-2xl">Batch actions</h2>
		<h3 class="text-xl">All instances</h3>
		<div class="flex flex-row gap-2">
			<button class="btn join-item btn-outline btn-primary">Pause all instances</button>
			<button class="btn join-item btn-outline btn-primary">Resume all instances</button>
			<button class="btn join-item btn-outline btn-primary">Update gravities</button>
		</div>
		<h3 class="text-xl">From Reference</h3>
		<div class="flex flex-row gap-2">
			<button class="btn join-item btn-outline btn-primary">Update lists from Reference</button>
		</div>
	</div>
</section>
