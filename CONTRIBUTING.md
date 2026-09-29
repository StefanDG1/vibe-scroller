# Contribute to CompanyNerve

The repository currently contains a planning foundation. Read the [decisions](docs/decisions.md) before starting application work.

1. Create a focused branch from `main`.
2. Read [AGENTS.md](AGENTS.md) and the relevant local skill.
3. Make one coherent change. Update the status or decision record when scope changes.
4. Run `node scripts/validate.mjs`.
5. Review the diff for credentials, private data, accidental copied product code, and claims that imply unfinished features work.
6. Open a pull request that explains the problem, resulting change, checks, and material limits.

Use ordinary Git commands from PowerShell, Bash, or your editor. No global coding skills are required for a clone. Application dependencies and a package lockfile will arrive in the approved implementation phase.

Keep third-party skill notices intact. Update their manifest hashes intentionally when upgrading them. Do not bulk-sync global skills into this repository. See [skill maintenance](docs/skills.md).

Use a private security channel described in [SECURITY.md](SECURITY.md) for sensitive findings. Do not paste secrets into an issue or PR.
