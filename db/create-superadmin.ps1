param(
  [string]$Name = "Edvais Makina",
  [string]$Email = "elvisedvais203@gmail.com",
  [string]$Phone = "+243895966288",
  [string]$Role = "SUPERADMIN",
  [string]$Password = "Edvais@CongoLove2026!",
  [string]$CreatedAt = "2026-04-06T00:00:00Z",
  [string]$ComposeFile = "docker-compose.yml",
  [string]$DbName = "kongolove",
  [string]$DbUser = "postgres"
)

$ErrorActionPreference = "Stop"

function Escape-SqlLiteral {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

# Map older role style to schema enum style.
if ($Role -eq "SUPER_ADMIN") {
  $Role = "SUPERADMIN"
}

if ($Role -ne "SUPERADMIN") {
  throw "Role invalide: $Role. Valeur attendue: SUPERADMIN (ou SUPER_ADMIN)."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker est requis pour exécuter ce script."
}

Write-Host "[1/5] Démarrage de PostgreSQL/Redis..."
docker compose -f $ComposeFile up -d postgres redis | Out-Host

Write-Host "[2/5] Création extension pgcrypto..."
docker compose -f $ComposeFile exec -T postgres psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" | Out-Host

Write-Host "[3/5] Application du schéma SQL fallback (idempotent partiel)..."
$schemaPath = Join-Path $PSScriptRoot "schema.sql"
if (-not (Test-Path $schemaPath)) {
  throw "Schema introuvable: $schemaPath"
}
Get-Content $schemaPath -Raw | docker compose -f $ComposeFile exec -T postgres psql -U $DbUser -d $DbName -v ON_ERROR_STOP=0 | Out-Host

Write-Host "[4/5] Hash du mot de passe + upsert super admin..."
$pwdHash = node -e "const bcrypt=require('bcryptjs'); bcrypt.hash(process.argv[1],12).then(h=>process.stdout.write(h));" "$Password"
if (-not $pwdHash) {
  throw "Impossible de générer le hash bcrypt. Vérifie que 'bcryptjs' est installé dans le projet."
}

$nameSql = Escape-SqlLiteral $Name
$emailSql = Escape-SqlLiteral $Email
$phoneSql = Escape-SqlLiteral $Phone
$roleSql = Escape-SqlLiteral $Role
$hashSql = Escape-SqlLiteral $pwdHash
$createdAtSql = Escape-SqlLiteral $CreatedAt

$upsertSql = @"
WITH upsert_user AS (
  INSERT INTO users (email, phone, password_hash, otp_verified, plan_tier, role, created_at, updated_at)
  VALUES ('$emailSql', '$phoneSql', '$hashSql', TRUE, 'PREMIUM', '$roleSql', '$createdAtSql', now())
  ON CONFLICT (phone)
  DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    otp_verified = TRUE,
    plan_tier = 'PREMIUM',
    role = 'SUPERADMIN',
    updated_at = now()
  RETURNING id
)
INSERT INTO profiles (user_id, display_name, bio, city, interests, verified_badge, last_active_at)
SELECT id, '$nameSql', 'Compte fondateur', 'Kinshasa', ARRAY['admin','security','growth'], TRUE, now()
FROM upsert_user
ON CONFLICT (user_id)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  city = EXCLUDED.city,
  interests = EXCLUDED.interests,
  verified_badge = EXCLUDED.verified_badge,
  last_active_at = now();
"@

docker compose -f $ComposeFile exec -T postgres psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -c $upsertSql | Out-Host

Write-Host "[5/5] Vérification..."
$verifySql = "SELECT u.id, u.email, u.phone, u.role, u.otp_verified, u.created_at, p.display_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.phone = '$phoneSql';"
docker compose -f $ComposeFile exec -T postgres psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -c $verifySql | Out-Host

Write-Host "Super admin créé/mis à jour avec succès." -ForegroundColor Green