const net = require("node:net");
const { spawnSync } = require("node:child_process");

const serviceName = "MSSQL$SQLEXPRESS";
const host = "127.0.0.1";
const port = 1433;

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function main() {
  if (await canConnect()) {
    console.log(`SQL Server disponible en ${host}:${port}.`);
    return;
  }

  if (process.platform !== "win32") {
    throw new Error(`No se puede conectar a SQL Server en ${host}:${port}.`);
  }

  const command = [
    `$service = Get-Service -Name '${serviceName}' -ErrorAction Stop`,
    "if ($service.Status -ne 'Running') { Start-Service -Name $service.Name }",
  ].join("; ");
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8" },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || "").trim();
    throw new Error(
      `No se pudo iniciar ${serviceName}. ${details || "Ejecuta PowerShell como administrador una vez para configurar el servicio."}`,
    );
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await canConnect()) {
      console.log(`SQL Server iniciado y disponible en ${host}:${port}.`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`SQL Server no responde en ${host}:${port} después de iniciarlo.`);
}

main().catch((error) => {
  console.error(`Preparación de SQL Server: ${error.message}`);
  process.exitCode = 1;
});
