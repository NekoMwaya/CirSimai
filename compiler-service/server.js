import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';

const execAsync = promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

// Limit to 2 concurrent compiles to prevent CPU overloading on shared VMs
const limit = pLimit(2);

// Path to arduino-cli in our Docker image
const ARDUINO_CLI_PATH = process.env.ARDUINO_CLI_PATH || '/bin/arduino-cli';

async function compileCode(code, libraries = []) {
  const jobId = uuidv4();
  
  // SECURITY SANDBOX: Use the OS temporary directory (/tmp) which is isolated
  const sketchFolder = path.join(os.tmpdir(), `sketch_${jobId}`);
  const sketchFile = path.join(sketchFolder, `sketch_${jobId}.ino`);
  const hexFile = path.join(sketchFolder, `sketch_${jobId}.ino.hex`);
  
  try {
    // 1. Create temp directory
    await fs.ensureDir(sketchFolder);
    
    // 2. Install requested libraries
    if (libraries && libraries.length > 0) {
      for (const lib of libraries) {
        if (typeof lib === 'string' && lib.trim() !== '') {
          // Double quotes to prevent shell injection, though still basic.
          const libName = lib.trim().replace(/"/g, '\\"');
          console.log(`Installing library: ${libName}`);
          try {
            await execAsync(`${ARDUINO_CLI_PATH} lib install "${libName}"`);
          } catch (libErr) {
            console.warn(`Warning: failed to install library ${libName}`, libErr.message);
            // We continue even if one library fails, as it might already be cached or be a built-in.
          }
        }
      }
    }
    
    // 2. Write the code to the .ino file
    await fs.writeFile(sketchFile, code);
    
    // 3. Run arduino-cli
    // We specify --output-dir so the hex goes right into our temp folder.
    const cmd = `${ARDUINO_CLI_PATH} compile --fqbn arduino:avr:uno --output-dir ${sketchFolder} ${sketchFile}`;
    await execAsync(cmd);
    
    // 4. Read the generated .hex file
    const hexData = await fs.readFile(hexFile, 'utf8');
    
    return hexData;
  } catch (error) {
    // Extract and throw the compiler stderr so the user gets actual C++ syntax errors
    throw new Error(error.stderr || error.message);
  } finally {
    // 5. Cleanup temp directory safely
    await fs.remove(sketchFolder).catch(console.error);
  }
}

app.post('/compile', async (req, res) => {
  const { code, libraries } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'No C++ code provided' });
  }

  try {
    // Enqueue the compilation job
    const hexData = await limit(() => compileCode(code, libraries));
    res.json({ hex: hexData });
  } catch (error) {
    console.error('Compilation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/libraries/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json({ libraries: [] });
  }

  try {
    // Prevent shell injection by escaping double quotes, though simple
    const safeQuery = query.replace(/"/g, '\\"');
    const cmd = `${ARDUINO_CLI_PATH} lib search "${safeQuery}" --format json`;
    
    // We execute arduino-cli lib search
    const { stdout } = await execAsync(cmd);
    
    // The output is standard JSON
    const result = JSON.parse(stdout);
    
    // limit to 15 results to prevent massive payloads
    res.json({ libraries: (result.libraries || []).slice(0, 15) });
  } catch (error) {
    console.error('Library search failed:', error.message);
    // If it fails (e.g. no results, or error), just return empty array instead of crashing
    res.json({ libraries: [] });
  }
});

// Basic health check route
app.get('/', (req, res) => {
  res.send('CirSimAI Compiler Service is running!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Compiler service listening on port ${PORT}`);
});
