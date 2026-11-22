import unittest
from package_php_staging import staging_base


class StagingBaseTests(unittest.TestCase):
    def test_allows_only_explicit_staging_subdirectory(self):
        self.assertEqual(staging_base('/test/'), '/test/')
        self.assertEqual(staging_base('/edijalmemoura/staging/'), '/edijalmemoura/staging/')
        for base in ('/', '/edijalmemoura/hospedae/', '/test', '/test/../', '//test/', '/Teste/', '/test/site/'):
            with self.subTest(base=base), self.assertRaises(ValueError):
                staging_base(base)


if __name__ == '__main__':
    unittest.main()
