import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
from package_hostinger import content, package


class PackageTests(unittest.TestCase):
    def test_demo_warning_is_explicit(self):
        self.assertIn("DEMONSTRAÇÃO LOCAL", content(True))
        self.assertIn("Não a use para receber reservas reais", content(True))
        self.assertNotIn("DEMONSTRAÇÃO LOCAL", content(False))

    def test_zip_extracts_without_nested_dist_folder(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "dist" / "assets").mkdir(parents=True)
            (root / "dist" / "index.html").write_text("<html></html>")
            (root / "dist" / ".htaccess").write_text("RewriteEngine On")
            (root / "dist" / "assets" / "app.js").write_text("console.log('ok')")
            with patch("package_hostinger.ROOT", root), patch("package_hostinger.DIST", root / "dist"), patch("package_hostinger.OUTPUT", root / "artifacts"):
                result = package(True, build=False)
            with zipfile.ZipFile(result) as archive:
                self.assertIn("index.html", archive.namelist())
                self.assertIn(".htaccess", archive.namelist())
                self.assertIn("assets/app.js", archive.namelist())
                self.assertNotIn("dist/index.html", archive.namelist())


if __name__ == "__main__":
    unittest.main()
