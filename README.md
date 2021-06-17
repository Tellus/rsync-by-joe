# rsync-by-joe

<p align="center">
  <a href="https://github.com/tellus/rsync-by-joe/actions"><img alt="javscript-action status" src="https://github.com/tellus/rsync-by-joe/workflows/units-test/badge.svg"></a>
</p>

Github action that uses a locally installed tools to transmit files to a remote host with `rsync`.

This action is different from most other rsync actions in that it does *not* use a Docker container to install the tools, instead relying either on locally installed binaries or binaries downloaded via an earlier action. This is useful in scenarios where you can't (or won't) have Docker running on a self-hosted runner.

If you're running actions on Github's runners or you have Docker available on your self-hosted runner, I highly recommend the alternatives on the marketplace. I'd argue that the clean environments and isolation of Docker containers are preferable whenever available/feasible.

## Prerequisites

The action requires the following programs to be present somewhere on the system:

- rsync (for base functionality)
- ssh-agent (to cache and pass on the authentication key)

As long as the binaries accept common parameters, it shouldn't matter which version you're using or source you're building from for a quick setup. If your binaries expect non-standard arguments, see the configuration reference further down.

This action does not (and will never) offer an automatic download of the tools, as a matter of security. If your runner's host system doesn't have the tools installed, either do so using local package management, or download the binaries to the workspace from **trusted** sources prior to running this agent.

### Linux

The vast majority of distributions have all prerequisites available as official packages. If not, you can download and build the [sources](https://rsync.samba.org/) yourself.

### Windows

`rsync` can be downloaded manually or through Chocolatey. There are several SSH agent options, both a built-in OpenSSH (optional features) or third party (such as PuTTY's `pageant`).

### Mac

`rsync` should be available via Homebrew. `ssh-agent` and the rest of the toolchain should be available on all recent Mac OS X version.


## Quickstart

The action requires these parameters as a minimum:

- host address of the remote to connect to.
- a private SSH key (added as a secret) with a matching public key registered in the remote's authorized_keys.
- a source path of files to copy.
- a destination of the files on the remote host.

A minimal setup could look like this:

```yaml
- name: deploy to remote host
  uses: tellus/rsync-by-joe@v1
  with:
    host: 'my-remote-host.null'
    source: '/'
    dest: '/srv/deployments/code/'
    ssh_key: ${{ secrets.PRIVATE_SSH_KEY }}
```

## Configuration reference



# Create a JavaScript Action (OLD README)

<p align="center">
  <a href="https://github.com/actions/javascript-action/actions"><img alt="javscript-action status" src="https://github.com/actions/javascript-action/workflows/units-test/badge.svg"></a>
</p>

Use this template to bootstrap the creation of a JavaScript action.:rocket:

This template includes tests, linting, a validation workflow, publishing, and versioning guidance.

If you are new, there's also a simpler introduction.  See the [Hello World JavaScript Action](https://github.com/actions/hello-world-javascript-action)

## Create an action from this template

Click the `Use this Template` and provide the new repo details for your action

## Code in Main

Install the dependencies

```bash
npm install
```

Run the tests :heavy_check_mark:

```bash
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)
...
```

## Change action.yml

The action.yml defines the inputs and output for your action.

Update the action.yml with your name, description, inputs and outputs for your action.

See the [documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions)

## Change the Code

Most toolkit and CI/CD operations involve async operations so the action is run in an async function.

```javascript
const core = require('@actions/core');
...

async function run() {
  try {
      ...
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
```

See the [toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages) for the various packages.

## Package for distribution

GitHub Actions will run the entry point from the action.yml. Packaging assembles the code into one file that can be checked in to Git, enabling fast and reliable execution and preventing the need to check in node_modules.

Actions are run from GitHub repos.  Packaging the action will create a packaged action in the dist folder.

Run prepare

```bash
npm run prepare
```

Since the packaged index.js is run from the dist folder.

```bash
git add dist
```

## Create a release branch

Users shouldn't consume the action from master since that would be latest code and actions can break compatibility between major versions.

Checkin to the v1 release branch

```bash
git checkout -b v1
git commit -a -m "v1 release"
```

```bash
git push origin v1
```

Note: We recommend using the `--license` option for ncc, which will create a license file for all of the production node modules used in your project.

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Usage

You can now consume the action by referencing the v1 branch

```yaml
uses: actions/javascript-action@v1
with:
  milliseconds: 1000
```

See the [actions tab](https://github.com/actions/javascript-action/actions) for runs of this action! :rocket:

## Known issues

- Github's ubuntu runner is using a version of rsync without --mkpath. We can fix this, but the focus right now is on self-hosted runners.