pub mod buy;
pub mod create_market;
pub mod extend_market;
pub mod initialize_protocol;
pub mod redeem;
pub mod sell;
pub mod settle;

// Each module also generates hidden `__client_accounts_*` / `__cpi_client_*`
// items (from `#[derive(Accounts)]`) that the `#[program]` macro in lib.rs
// needs re-exported at this level, so these have to be full globs. Every
// module also happens to export a `handler` fn, which makes the glob
// re-export of that one specific name ambiguous -- harmless, since lib.rs
// only ever calls `handler` through its fully qualified module path.
#[allow(ambiguous_glob_reexports)]
mod reexports {
    pub use super::buy::*;
    pub use super::create_market::*;
    pub use super::extend_market::*;
    pub use super::initialize_protocol::*;
    pub use super::redeem::*;
    pub use super::sell::*;
    pub use super::settle::*;
}
pub use reexports::*;
