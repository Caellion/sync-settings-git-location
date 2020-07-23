const path = require('path')
const os = require('os')
const fs = require('fs-extra')
const git = require('../lib/git')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const { config } = require('../lib/config')

function setDefaultConfig (prefix = 'sync-settings-git-location', obj = config) {
	for (const name in obj) {
		const configPath = `${prefix}.${name}`
		if (obj[name].type === 'object' && 'properties' in obj[name]) {
			setDefaultConfig(configPath, obj[name].properties)
		} else if ('default' in obj[name]) {
			atom.config.set(configPath, obj[name].default)
		}
	}
}

describe('git', () => {
	let gitUrl
	beforeEach(async () => {
		setDefaultConfig()

		gitUrl = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-settings-git-bare-repo-'))
		await exec('git init --bare', { cwd: gitUrl })
		atom.config.set('sync-settings-git-location.gitUrl', gitUrl)
	})

	afterEach(async () => {
		if (gitUrl) {
			await fs.remove(gitUrl)
		}
	})

	it('returns correct properties', async () => {
		const data = await git.get()
		expect(Object.keys(data.files).length).toBe(0)
		const data2 = await git.update({
			'init.coffee': {
				content: '# init',
			},
		})
		expect(data2).toEqual({
			time: jasmine.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/),
		})
		const data3 = await git.get()
		expect(data3).toEqual({
			files: {
				'init.coffee': jasmine.any(Object),
			},
			time: jasmine.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/),
		})
		expect(data3.files['init.coffee'].content.toString()).toBe('# init')
	})

	it('add, get, delete files in a directory', async () => {
		await git.update({
			'dir\\test.txt': {
				content: 'test',
			},
		})

		const data = await git.get()
		expect(data.files).toEqual(jasmine.objectContaining({
			'dir\\test.txt': jasmine.any(Object),
		}))
		expect(data.files['dir\\test.txt'].content.toString()).toBe('test')

		await git.update({
			'dir\\test.txt': {
				content: '',
			},
		})

		const data2 = await git.get()
		expect(data2.files).toEqual({})
	})

	it('uses commit message config', async () => {
		const commitMessage = 'a commit message with symbols ";\'\n\nand new lines'
		atom.config.set('sync-settings-git-location.commitMessage', commitMessage)

		await git.update({
			'dir\\test.txt': {
				content: 'test',
			},
		})

		const log = await exec('git log -1 --format=%B', { cwd: gitUrl })
		expect(log.stdout.trim()).toBe(commitMessage)
	})

	xit('creates a git', async () => {
		// TODO:
	})

	xit('deletes the git repo', async () => {
		// TODO:
	})

	xit('forks a git repo', async () => {
		// TODO:
	})
})
