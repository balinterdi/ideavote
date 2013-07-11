set :domain,      'ideavote.balinterdi.com'
set :application, 'ideavote'
set :deploy_to,   '/var/www/apps/ideavote'
set :user,        'ideavote'
set :use_sudo,    false
set :scm,         :git
set :branch,      'separate-environments'
set :repository,  'git@github.com:balinterdi/ideavote.git'
