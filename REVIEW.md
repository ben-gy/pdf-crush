# PDF Crush — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/pdf-crush/ *(redirects to custom domain once DNS propagates)*
- **Custom domain:** https://pdf-crush.benrichardson.dev *(live after DNS + TLS cert below)*

## DNS setup

Cloudflare DNS record already created:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `pdf-crush` | `ben-gy.github.io` | DNS only (grey cloud) ✓ |

To re-trigger TLS cert issuance if needed:
```bash
gh api repos/ben-gy/pdf-crush/pages -X PUT -f cname=""
sleep 3
gh api repos/ben-gy/pdf-crush/pages -X PUT -f cname="pdf-crush.benrichardson.dev"
```
