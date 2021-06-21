# rsync-by-joe

<p align="center">
<a href="https://github.com/tellus/rsync-by-joe/actions"><img alt="javscript-action status" src="https://github.com/tellus/rsync-by-joe/workflows/semantic-release-ci/badge.svg"></a>
  <a href="https://github.com/tellus/rsync-by-joe/actions"><img alt="javscript-action status" src="https://github.com/tellus/rsync-by-joe/workflows/unit-tests/badge.svg"></a>
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

## Known issues

- Github's ubuntu runner is using a version of rsync without --mkpath. We can fix this, but the focus right now is on self-hosted runners.
- Currently only supports a single exclusion pattern.