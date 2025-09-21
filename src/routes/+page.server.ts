import { PiHoleClient } from '$lib/clients/pihole_client';

export const load = async ({ locals }) => {
	let piHoleClient = new PiHoleClient(
		'http://192.168.1.29:880',
		'bamcRAdfwFqecE0HjDLgLqfGon5Y6TykFIIEvrN3mf0='
	);
	let result = await piHoleClient.authenticate();
	console.log(piHoleClient);
	return {
		result
	};
};
//bamcRAdfwFqecE0HjDLgLqfGon5Y6TykFIIEvrN3mf0=
