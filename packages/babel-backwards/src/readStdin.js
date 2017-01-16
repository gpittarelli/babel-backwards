import fs from 'fs';

// Taken from http://stackoverflow.com/questions/3430939/node-js-readsync-from-stdin/16048083#16048083
export default function readStdin() {
  const BUFSIZE = 256;
  const buf = 'alloc' in Buffer ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
  let bytesRead;
  let out = '';

  do {
    try {
      bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE);
    }
    catch (e) {
      if (e.code === 'EAGAIN') { // 'resource temporarily unavailable'
        // Happens on OS X 10.8.3 (not Windows 7!), if there's no
        // stdin input - typically when invoking a script without any
        // input (for interactive stdin input).
        // If you were to just continue, you'd create a tight loop.
        throw e;
      }
      else if (e.code === 'EOF') {
        // Happens on Windows 7, but not OS X 10.8.3:
        // simply signals the end of *piped* stdin input.
        break;
      }
      throw e; // unexpected exception
    }
    // Process the chunk read.
    out += buf.toString('utf8', 0, bytesRead);
  } while (bytesRead !== 0); // Loop as long as stdin input is available.

  return out;
}
