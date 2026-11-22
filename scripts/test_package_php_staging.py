import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
import package_php_staging as staging


class StagingPackageTests(unittest.TestCase):
    def test_allows_only_explicit_staging_subdirectory(self):
        self.assertEqual(staging.staging_base('/test/'), '/test/')
        self.assertEqual(staging.staging_base('/edijalmemoura/staging/'), '/edijalmemoura/staging/')
        for base in ('/', '/edijalmemoura/hospedae/', '/test', '/test/../', '//test/', '/Teste/', '/test/site/'):
            with self.subTest(base=base), self.assertRaises(ValueError):
                staging.staging_base(base)

    def test_archive_includes_only_public_frontend_and_php_endpoints(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dist, api = root / 'dist', root / 'backend' / 'public' / 'api'
            (dist / 'assets').mkdir(parents=True)
            (dist / 'images').mkdir()
            api.mkdir(parents=True)
            (dist / 'index.html').write_text('/test/assets/app.js /test/images/icon.png')
            (dist / '.htaccess').write_text('RewriteEngine On')
            (dist / 'assets' / 'app.js').write_text('console.log(1)')
            (dist / 'images' / 'icon.png').write_bytes(b'png')
            (api / 'index.php').write_text('<?php echo "ok";')
            output = root / 'artifacts' / 'ensaios.zip'
            with patch.object(staging, 'ROOT', root), patch.object(staging, 'DIST', dist), patch.object(staging, 'API', api), patch.object(staging, 'OUTPUT', output):
                staging.package('/test/', build=False)
                with zipfile.ZipFile(output) as archive:
                    self.assertEqual(set(archive.namelist()), {
                        'index.html', '.htaccess', 'assets/app.js', 'images/icon.png',
                        'api/index.php', 'LEIA-ME-ENSAIO.txt',
                    })
                (dist / 'config.php').write_text('private-secret')
                with self.assertRaisesRegex(ValueError, 'Ficheiro não permitido'):
                    staging.package('/test/', build=False)


if __name__ == '__main__':
    unittest.main()
