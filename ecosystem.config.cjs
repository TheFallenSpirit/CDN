module.exports = { apps: [{
    time: true,
    name: 'FS CDN',
    interpreter: 'deno',
    script: 'src/app.ts',
    interpreterArgs: '--env --allow-env --allow-net --allow-ffi --allow-read --allow-write'
}] };
