<script lang="ts">
	import { type PiHoleInstance } from '$lib/types/types';

	let piHoleInstances: PiHoleInstance[] = $state([]);

	piHoleInstances = [
		{
			id: 1,
			name: 'Pi-hole 1',
			url: 'https://pihole.example.com',
			apiKey: '1234567890',
			isReference: true,
			isActive: true
		},
		{
			id: 2,
			name: 'Pi-hole 2',
			url: 'https://pihole.example.com',
			apiKey: '1234567890',
			isReference: false,
			isActive: false
		},
		{
			id: 3,
			name: 'Pi-hole 3',
			url: 'https://pihole.example.com',
			apiKey: '1234567890',
			isReference: false,
			isActive: true
		}
	];
	let showAddInstancePanel = $state(false);
	let newInstanceName = $state('');
	let newInstanceUrl = $state('');
	let newInstanceApiKey = $state('');

	function addInstance() {
		let newInstances = [...piHoleInstances];
		newInstances.push({
			id: piHoleInstances.length + 1,
			name: newInstanceName,
			url: newInstanceUrl,
			apiKey: newInstanceApiKey,
			isReference: false,
			isActive: false
		});
		piHoleInstances = newInstances;
		showAddInstancePanel = false;
		newInstanceName = '';
		newInstanceUrl = '';
		newInstanceApiKey = '';
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
						<th>Is Active</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<!-- row 1 -->
					{#each piHoleInstances as piHoleInstance}
						<tr>
							<td>{piHoleInstance.name}</td>
							<td>{piHoleInstance.url}</td>
							<td
								>{#if piHoleInstance.isReference}<div class="badge badge-soft badge-success">
										Reference
									</div>{/if}</td
							>
							<td
								>{#if piHoleInstance.isActive}
									<div class="badge badge-soft badge-success">Active</div>
								{:else}
									<div class="badge badge-soft badge-error">Unreachable</div>
								{/if}
							</td>
							<td>
								<button class="btn btn-ghost btn-soft btn-sm">Edit</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="flex flex-row justify-center gap-2">
				<button
					class="btn btn-soft btn-primary"
					onclick={() => (showAddInstancePanel = !showAddInstancePanel)}
				>
					Add Pi-hole instance
				</button>
			</div>
		</div>
		{#if showAddInstancePanel}
			<dialog id="add_pihole_instance_modal" class="modal-open modal">
				<div class="modal-box flex flex-col gap-4">
					<h3 class="text-lg font-bold">Add a new Pi-hole instance</h3>
					<form class="flex flex-col gap-2">
						<label class="label">Instance name</label>
						<input
							type="text"
							class="input w-full"
							placeholder="Instance name"
							bind:value={newInstanceName}
						/>

						<label class="label">Instance URL</label>
						<input
							type="text"
							class="input w-full"
							placeholder="https://pihole.example.com:port"
							bind:value={newInstanceUrl}
						/>

						<label class="label">API Key</label>
						<input
							type="text"
							class="input w-full"
							placeholder="1234567890"
							bind:value={newInstanceApiKey}
						/>
					</form>
					<div class="flex w-full flex-row justify-between">
						<button class="btn btn-ghost btn-soft" onclick={() => (showAddInstancePanel = false)}
							>Cancel</button
						>
						<button class="btn btn-primary" onclick={addInstance}> Add </button>
					</div>
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
