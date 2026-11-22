<?php

declare(strict_types=1);

require_once __DIR__ . '/configuration/configuration_api.php';

ConfigurationApi::chargerEnvironnement(__DIR__);

require __DIR__ . '/vues/page_principale.php';