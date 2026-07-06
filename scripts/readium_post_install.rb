# Local wrapper — upstream readium_post_install.rb crashes when OTHER_CFLAGS is an Array.
# Modulemap rewrite matches react-native-readium/scripts/readium_post_install.rb.

def verso_readium_post_install(installer)
  modulemap_content = <<~MODULEMAP
    module Minizip [extern_c] [system] {
      header "Minizip-umbrella.h"
      export *
    }
  MODULEMAP

  framework_modulemap_content = <<~MODULEMAP
    framework module Minizip [extern_c] [system] {
      umbrella header "Minizip-umbrella.h"
      export *
    }
  MODULEMAP

  framework_path = File.join(installer.sandbox.root, 'Target Support Files', 'Minizip', 'Minizip.modulemap')
  headers_path = File.join(installer.sandbox.root, 'Headers', 'Public', 'Minizip', 'Minizip.modulemap')

  File.write(framework_path, framework_modulemap_content) if File.exist?(framework_path)
  File.write(headers_path, modulemap_content) if File.exist?(headers_path)

  installer.pods_project.targets.each do |target|
    next unless target.name == 'Minizip'

    target.build_configurations.each do |config|
      %w[OTHER_CFLAGS OTHER_CPLUSPLUSFLAGS].each do |key|
        flags = config.build_settings[key] || '$(inherited)'
        flags = [flags] unless flags.is_a?(Array)
        flags = flags.dup
        next if flags.any? { |f| f.to_s.include?('-Wno-module-import-in-extern-c') }

        flags << '-Wno-module-import-in-extern-c'
        config.build_settings[key] = flags
      end
    end
  end
end
