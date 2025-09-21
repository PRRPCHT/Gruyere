export class PiHoleClient {
	sid: string = '';
	csrf: string = '';
	url: string = '';
	password: string = '';

	constructor(url: string, password: string) {
		this.url = url;
		this.password = password;
	}

	async authenticate(): Promise<boolean> {
		try {
			const response = await fetch(`${this.url}/api/auth`, {
				method: 'POST',
				body: JSON.stringify({
					password: this.password
				})
			});

			const data = await response.json();
			console.log(data);
			if (data.session) {
				this.sid = data.session.sid;
				this.csrf = data.session.csrf;
				return true;
			}
			return false;
		} catch (error) {
			console.error(error);
			return false;
		}
	}
}
