// Környezeti változók beolvasása és ellenőrzése induláskor.
// Ha egy kötelező változó hiányzik, a folyamat érthető hibaüzenettel leáll,
// így Kubernetesben a hiba azonnal látszik a pod logjában.

const REQUIRED = ['MONGO_URI', 'JWT_SECRET']

const loadConfig = () => {
  const missing = REQUIRED.filter((name) => !process.env[name])

  if (missing.length > 0) {
    // Itt még szándékosan nem a loggert használjuk, hogy a hiba
    // akkor is olvasható legyen, ha valami a logger körül is rossz.
    console.error(
      `HIBA: hiányzó kötelező környezeti változó(k): ${missing.join(', ')}. ` +
        'Helyi fejlesztéshez másold a .env.example fájlt .env néven és töltsd ki; ' +
        'Kubernetesben ConfigMap / Secret adja meg őket.'
    )
    process.exit(1)
  }

  return {
    port: Number(process.env.PORT) || 8080,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development',
    // A reverse proxy (Gateway / load balancer) mely címeiben bízzunk meg.
    // Alapértelmezés: csak privát hálózatokból (VPC, docker hálózat) érkező proxyk.
    trustProxy:
      process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal',
  }
}

module.exports = loadConfig
