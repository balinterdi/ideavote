set :application, 'ideavote'
set :repo_url,    'git@github.com:balinterdi/ideavote.git'

set :domain,      'ideavote.balinterdi.com'
set :deploy_to,   '/var/www/apps/ideavote'
set :user,        'ideavote'
set :use_sudo,    false
set :scm,         :git
# set :branch,      'separate-environments'
ask :branch, proc { `git rev-parse --abbrev-ref HEAD`.chomp }

set :format, :pretty
set :log_level, :debug
# set :pty, true

# set :linked_files, %w{config/database.yml}
# set :linked_dirs, %w{bin log tmp/pids tmp/cache tmp/sockets vendor/bundle public/system}

# set :default_environment, { path: "/opt/ruby/bin:$PATH" }
# set :keep_releases, 5
