# auto-visit

Automate visit link (ads)
## Overview


- ✅ Proxy support for requests
- ✅ random visit via proxy
- ✅ looping


## Requirements

- Node.js (v16 or later)
- npm or yarn


## Installation

```bash
# Clone the repository
git clone https://github.com/winktruts/auto-visit.git

# Navigate to project directory
cd auto-visit

# Install dependencies
npm init -y
npm install puppeteer

```

## Configuration

1. masukan links di links.txt
2. ganti proxy, proxies.txt


### Proxy Format

Proxies can be specified in any of these formats:

```
host:port
host:port:username:password
username:password@host:port
```


## Usage

Run the bot:

```bash
node open-links.js
```


## License

MIT
